// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import database.EbeanPaths.{path, props}
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.ExamState
import models.exam.{Course, Exam}
import models.facility.ExamRoom
import play.api.libs.json.{Json, Writes}
import services.datetime.TimeUtils
import services.excel.ExcelBuilder

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
    val from  = start.map(TimeUtils.parseInstant)
    val until = end.map(e => TimeUtils.parseInstant(e).plus(Duration.ofDays(1)))
    def inRange(el: ExpressionList[ExamEnrolment], field: String) =
      val withFrom = from.fold(el)(el.ge(field, _))
      until.fold(withFrom)(withFrom.lt(field, _))
    val enrolments =
      if from.isEmpty && until.isEmpty then withDept.distinct
      else
        val local = inRange(
          withDept.or().and().isNull(path[ExamEnrolment]("externalExam")),
          path[ExamEnrolment]("exam.created")
        ).endAnd()
        inRange(
          local.and().isNotNull(path[ExamEnrolment]("externalExam")),
          path[ExamEnrolment]("externalExam.started")
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
    // different paths, hence the separate queries.
    val reserved = withFilters(
      DB.find(classOf[ExamEnrolment]).where().isNotNull(path[ExamEnrolment]("reservation")),
      path[ExamEnrolment]("exam.course.department"),
      path[ExamEnrolment]("reservation.startAt"),
      dept,
      start,
      end
    ).distinct
    val byod = withFilters(
      DB.find(classOf[ExamEnrolment]).where().isNotNull(
        path[ExamEnrolment]("examinationEventConfiguration")
      ),
      path[ExamEnrolment]("exam.course.department"),
      path[ExamEnrolment]("examinationEventConfiguration.examinationEvent.start"),
      dept,
      start,
      end
    ).distinct
    (reserved ++ byod).toList.distinctBy(_.id).partition(_.noShow) match
      case (a, b) => (a.size, b.size)

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
    val pp = props[Exam]("(id, course(code), parent(id, name, course(code)))")
    val query = DB
      .find(classOf[Exam])
      .apply(pp)
      .where()
      .isNotNull(path[Exam]("parent"))
      .in(path[Exam]("state"), AttemptStates.asJava)
    // Both filters target the student's copy rather than the template it was made from - an exam
    // published last year can still be taken this year, and the template's own state is irrelevant.
    val attempts = withFilters(
      query,
      path[Exam]("course.department"),
      path[Exam]("created"),
      dept,
      start,
      end
    ).distinct

    // Missing course data must not drop an attempt from the count, so fall back to the student's
    // copy and finally to an empty code rather than filtering these rows out.
    def courseCode(exam: Exam) = Option(exam.course).flatMap(c => Option(c.code))

    attempts
      .groupBy(_.parent.id)
      .values
      .map { children =>
        val parent = children.head.parent
        val code   = courseCode(parent).orElse(courseCode(children.head)).getOrElse("")
        ExamInfo(s"[$code] ${parent.name}", children.size)
      }
      .toList

  def listResponses(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): (Int, Int, Int) =
    val query = DB
      .find(classOf[Exam])
      .where()
      .isNotNull(path[Exam]("parent"))
      .isNotNull(path[Exam]("course"))
      .in(path[Exam]("state"), AttemptStates.asJava)
    val exams = withFilters(
      query,
      path[Exam]("course.department"),
      path[Exam]("created"),
      dept,
      start,
      end
    ).distinct
    val aborted = exams.count(_.state == ExamState.ABORTED)
    val assessed = exams.count(_.hasState(
      ExamState.GRADED,
      ExamState.GRADED_LOGGED,
      ExamState.ARCHIVED,
      ExamState.REJECTED,
      ExamState.DELETED
    ))
    val unassessed = exams.count(_.hasState(
      ExamState.STUDENT_STARTED,
      ExamState.REVIEW,
      ExamState.REVIEW_STARTED
    ))
    (aborted, assessed, unassessed)

  /** Streams the score Excel to the given output stream. Caller must close the stream. */
  def streamExamQuestionScoresAsExcel(
      examId: Long,
      childIds: List[Long]
  )(os: java.io.OutputStream): Unit =
    val parentProps = props[Exam](
      """(id,
        |examSections(name,
        |  sectionQuestions(id,
        |    question(id,
        |      parent(id)))))""".stripMargin
    )
    val parentExam = DB
      .find(classOf[Exam])
      .apply(parentProps)
      .where()
      .eq(path[Exam]("id"), examId)
      .find
      .getOrElse(throw new RuntimeException(s"parent exam $examId not found"))

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
      .eq(path[Exam]("parent.id"), examId)
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
    val withStart = start.fold(withDept) { s =>
      withDept.ge(dateField, TimeUtils.parseInstant(s))
    }
    end.fold(withStart) { e =>
      withStart.lt(
        dateField,
        TimeUtils.parseInstant(e).plus(Duration.ofDays(1))
      )
    }
