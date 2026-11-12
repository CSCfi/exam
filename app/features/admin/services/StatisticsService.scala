// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import database.EbeanPaths.{path, props}
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.annotation.EnumValue
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.ExamState
import models.exam.{Course, Exam}
import models.facility.ExamRoom
import play.api.libs.json.{Json, Writes}
import services.datetime.TimeUtils
import services.excel.ExcelBuilder

import java.sql.Timestamp
import java.time.format.DateTimeFormatter
import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class StatisticsService @Inject() (
    private val excelBuilder: ExcelBuilder
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  case class ExamInfo(name: String, participations: Int)
  object ExamInfo:
    implicit val writes: Writes[ExamInfo] = Json.writes[ExamInfo]

  case class Participation(date: String)
  object Participation:
    def apply(instant: Instant): Participation =
      Participation(DateTimeFormatter.ISO_INSTANT.format(instant))
    implicit val writes: Writes[Participation] = Json.writes[Participation]

  def listDepartments: List[String] =
    DB
      .find(classOf[Course])
      .where()
      .isNotNull(path[Course]("department"))
      .distinct
      .map(_.department)
      .toList

  def listParticipations(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): Map[String, Set[Participation]] =
    val pp = props[ExamEnrolment](
      """(noShow,
        |exam(created,
        |  course(department)
        |),
        |externalExam(started),
        |reservation(
        |  machine(
        |    room(id, name, outOfService)
        |  )
        |)
        |)""".stripMargin
    )
    val query = DB
      .find(classOf[ExamEnrolment])
      .apply(pp)
      .where()
      .or()
      .ne(path[ExamEnrolment]("exam.state"), ExamState.PUBLISHED)
      .isNotNull(path[ExamEnrolment]("externalExam.started"))
      .endOr()
      .isNotNull(path[ExamEnrolment]("reservation.machine"))
      .ne(path[ExamEnrolment]("noShow"), true)
    // External exams carry no local course, hence no department to match against
    val withDept =
      if dept.isEmpty then query
      else
        query.isNull(path[ExamEnrolment]("externalExam")).in(
          path[ExamEnrolment]("exam.course.department"),
          dept*
        )
    // The participation date lives on the external exam if there is one, otherwise on the local
    // exam, so the date range is applied to whichever of the two the enrolment has
    val enrolments =
      if start.isEmpty && end.isEmpty then withDept.distinct
      else
        val local = inRange(
          withDept.or().and().isNull(path[ExamEnrolment]("externalExam")),
          path[ExamEnrolment]("exam.created"),
          start,
          end
        ).endAnd()
        inRange(
          local.and().isNotNull(path[ExamEnrolment]("externalExam")),
          path[ExamEnrolment]("externalExam.started"),
          start,
          end
        )
          .endAnd()
          .endOr()
          .distinct

    def participationDate(enrolment: ExamEnrolment) =
      Option(enrolment.externalExam).map(_.started).getOrElse(enrolment.exam.created)

    val roomMap = enrolments
      .groupBy { enrolment =>
        val room = enrolment.reservation.machine.room
        s"${room.id}___${room.name}"
      }
      .view
      .mapValues(_.map(enrolment => Participation(participationDate(enrolment))))
      .toMap

    // Fill in rooms with no participations
    val allRooms = DB.find(classOf[ExamRoom]).where().eq(path[ExamRoom]("outOfService"), false).list
    allRooms.foldLeft(roomMap) { (map, room) =>
      val key = s"${room.id}___${room.name}"
      if map.contains(key) then map else map + (key -> Set.empty[Participation])
    }

  def listReservations(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): (Int, Int) =
    // Both figures cover every enrolment that was actually due to be sat: room reservations and
    // BYOD examination events alike. The no-show sweep flags both kinds, so they belong on the same
    // denominator - without them, an unbounded search would count every enrolment ever made against
    // a no-show total that only ever includes due ones. The two carry their scheduled time on
    // different paths, hence the disjunction.
    def due() =
      val query = DB.find(classOf[ExamEnrolment]).where()
      val withDept =
        if dept.isEmpty then query
        else query.in(path[ExamEnrolment]("exam.course.department"), dept*)
      val reserved = inRange(
        withDept.or().and().isNotNull(path[ExamEnrolment]("reservation")),
        path[ExamEnrolment]("reservation.startAt"),
        start,
        end
      ).endAnd()
      inRange(
        reserved.and().isNotNull(path[ExamEnrolment]("examinationEventConfiguration")),
        path[ExamEnrolment]("examinationEventConfiguration.examinationEvent.start"),
        start,
        end
      ).endAnd().endOr()
    val total   = due().findCount()
    val noShows = due().eq(path[ExamEnrolment]("noShow"), true).findCount()
    (noShows, total - noShows)

  def listIopReservations(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): List[Reservation] =
    val pp = props[Reservation](
      "(*, enrolment(noShow, externalExam(finished)), externalReservation(*))"
    )
    val query = DB.find(classOf[Reservation]).apply(pp)
    val el    = query.where().isNotNull(path[Reservation]("externalRef"))
    withFilters(
      el,
      path[Reservation]("enrolment.exam.course.department"),
      path[Reservation]("startAt"),
      dept,
      start,
      end
    ).distinct
      .filter(r =>
        Option(r.externalOrgName).isDefined || Option(r.externalReservation).isDefined
      )
      .toList

  /** States a student's exam copy can be in once it has actually been started. Shared by the
    * response and exam figures so that both count the same population.
    *
    * INITIALIZED is deliberately excluded - the copy exists but the student never began the exam,
    * so it is neither an attempt nor a response awaiting assessment. Reaching any of these states
    * means createFinalExam has run and written the participation record, so no separate
    * examParticipation check is needed.
    */
  private val AttemptStates = List(
    ExamState.STUDENT_STARTED,
    ExamState.REVIEW,
    ExamState.REVIEW_STARTED,
    ExamState.GRADED,
    ExamState.GRADED_LOGGED,
    ExamState.ARCHIVED,
    ExamState.ABORTED,
    ExamState.DELETED,
    ExamState.REJECTED
  )

  def listPublishedExams(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): List[ExamInfo] =
    // Both filters target the student's copy rather than the template it was made from - an exam
    // published last year can still be taken this year, and the template's own state is irrelevant.
    // Missing course data must not drop an attempt from the count, so the code falls back to the
    // students' copies and finally to an empty string rather than filtering these rows out.
    val conditions = List(
      Option.when(dept.nonEmpty)("cc.department IN (:depts)"),
      start.map(_ => "c.created >= :start"),
      end.map(_ => "c.created < :end")
    ).flatten.map(cond => s"AND $cond").mkString("\n")
    val sql =
      s"""SELECT p.name, COALESCE(pc.code, MIN(cc.code), '') AS code, COUNT(*) AS participations
         |FROM exam c
         |JOIN exam p ON p.id = c.parent_id
         |LEFT JOIN course pc ON pc.id = p.course_id
         |LEFT JOIN course cc ON cc.id = c.course_id
         |WHERE c.state IN (${AttemptStates.map(dbValue).mkString(", ")})
         |$conditions
         |GROUP BY p.id, p.name, pc.code""".stripMargin
    val query = DB.sqlQuery(sql)
    if dept.nonEmpty then query.setParameter("depts", dept.asJava)
    start.foreach(s => query.setParameter("start", Timestamp.from(TimeUtils.parseInstant(s))))
    end.foreach(e =>
      query.setParameter("end", Timestamp.from(TimeUtils.parseInstant(e).plus(Duration.ofDays(1))))
    )
    query
      .findList()
      .asScala
      .map(row =>
        ExamInfo(
          s"[${row.getString("code")}] ${row.getString("name")}",
          row.getInteger("participations")
        )
      )
      .toList

  def listResponses(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): (Int, Int, Int) =
    def count(states: ExamState*) =
      val query = DB
        .find(classOf[Exam])
        .where()
        .isNotNull(path[Exam]("parent"))
        .isNotNull(path[Exam]("course"))
        .in(path[Exam]("state"), states.asJava)
      withFilters(
        query,
        path[Exam]("course.department"),
        path[Exam]("created"),
        dept,
        start,
        end
      ).findCount()
    val aborted = count(ExamState.ABORTED)
    val assessed = count(
      ExamState.GRADED,
      ExamState.GRADED_LOGGED,
      ExamState.ARCHIVED,
      ExamState.REJECTED,
      ExamState.DELETED
    )
    val unassessed = count(ExamState.STUDENT_STARTED, ExamState.REVIEW, ExamState.REVIEW_STARTED)
    (aborted, assessed, unassessed)

  def findExamForQuestionScores(examId: Long): Option[Exam] =
    val parentProps = props[Exam](
      """(id,
        |examSections(name,
        |  sectionQuestions(id,
        |    question(id,
        |      parent(id)))))""".stripMargin
    )
    DB
      .find(classOf[Exam])
      .apply(parentProps)
      .where()
      .eq(path[Exam]("id"), examId)
      .find

  /** Streams the score Excel to the given output stream. Caller must close the stream. */
  def streamExamQuestionScoresAsExcel(
      parentExam: Exam,
      childIds: List[Long]
  )(os: java.io.OutputStream): Unit =
    val childProps = props[Exam](
      """(id, state,
        |examParticipation(
        |  user(id, eppn, firstName, lastName, email, userIdentifier)),
        |examSections(name,
        |  sectionQuestions(evaluationType, forcedScore, maxScore, negativeScoreAllowed,
        |    question(id, type,
        |      parent(id)),
        |    options(answered, score,
        |      option(id, correctOption, defaultScore)),
        |    essayAnswer(evaluatedScore),
        |    clozeTestAnswer(*))),
        |examRecord(
        |  examScore(id)))""".stripMargin
    )
    val childExams = DB
      .find(classOf[Exam])
      .apply(childProps)
      .where()
      .eq(path[Exam]("parent.id"), parentExam.id)
      .in(path[Exam]("id"), childIds.asJava)
      .list
    excelBuilder.streamScores(parentExam, childExams)(os)

  private def withFilters[T](
      query: ExpressionList[T],
      deptField: String,
      dateField: String,
      depts: List[String],
      start: Option[String],
      end: Option[String]
  ): ExpressionList[T] =
    val withDept =
      if depts.isEmpty then query else query.in(deptField, depts*)
    inRange(withDept, dateField, start, end)

  /** Restricts `field` to the searched period. The end date is inclusive, hence the extra day. */
  private def inRange[T](
      el: ExpressionList[T],
      field: String,
      start: Option[String],
      end: Option[String]
  ): ExpressionList[T] =
    val withStart = start.fold(el)(s => el.ge(field, TimeUtils.parseInstant(s)))
    end.fold(withStart)(e =>
      withStart.lt(field, TimeUtils.parseInstant(e).plus(Duration.ofDays(1)))
    )

  // The value Ebean stores for a state, for use in raw SQL
  private def dbValue(state: ExamState): String =
    classOf[ExamState].getField(state.name).getAnnotation(classOf[EnumValue]).value
