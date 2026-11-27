// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.ExamState
import models.exam.{Course, Exam}
import models.facility.ExamRoom
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.{Json, Writes}
import services.excel.ExcelBuilder

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
    def apply(dateTime: DateTime): Participation =
      Participation(ISODateTimeFormat.dateTime.print(dateTime))
    implicit val writes: Writes[Participation] = Json.writes[Participation]

  def listDepartments: List[String] =
    DB
      .find(classOf[Course])
      .where()
      .isNotNull("department")
      .distinct
      .map(_.department)
      .toList

  def listParticipations(
      dept: List[String],
      start: Option[String],
      end: Option[String]
  ): Map[String, Set[Participation]] =
    val pp = PathProperties.parse(
      """noShow,
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
      .ne("exam.state", ExamState.PUBLISHED)
      .isNotNull("externalExam.started")
      .endOr()
      .isNotNull("reservation.machine")
      .ne("noShow", true)
    // External exams carry no local course, hence no department to match against
    val withDept =
      if dept.isEmpty then query
      else query.isNull("externalExam").in("exam.course.department", dept*)
    // The participation date lives on the external exam if there is one, otherwise on the local
    // exam, so the date range is applied to whichever of the two the enrolment has
    val from = start.map(s => DateTime.parse(s, ISODateTimeFormat.dateTimeParser()).toDate)
    val until =
      end.map(e => DateTime.parse(e, ISODateTimeFormat.dateTimeParser()).plusDays(1).toDate)
    def inRange(el: ExpressionList[ExamEnrolment], field: String) =
      val withFrom = from.fold(el)(el.ge(field, _))
      until.fold(withFrom)(withFrom.lt(field, _))
    val enrolments =
      if from.isEmpty && until.isEmpty then withDept.distinct
      else
        val local = inRange(withDept.or().and().isNull("externalExam"), "exam.created").endAnd()
        inRange(local.and().isNotNull("externalExam"), "externalExam.started")
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
    val allRooms = DB.find(classOf[ExamRoom]).where().eq("outOfService", false).list
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
      DB.find(classOf[ExamEnrolment]).where().isNotNull("reservation"),
      "exam.course",
      "reservation.startAt",
      dept,
      start,
      end
    ).distinct
    val byod = withFilters(
      DB.find(classOf[ExamEnrolment]).where().isNotNull("examinationEventConfiguration"),
      "exam.course",
      "examinationEventConfiguration.examinationEvent.start",
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
    val pp =
      PathProperties.parse("*, enrolment(noShow, externalExam(finished)), externalReservation(*)")
    val query = DB.find(classOf[Reservation]).apply(pp)
    val el    = query.where().isNotNull("externalRef")
    withFilters(el, "enrolment.exam.course", "startAt", dept, start, end).distinct
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
    val pp = PathProperties.parse("(id, course(code), parent(id, name, course(code)))")
    val query = DB
      .find(classOf[Exam])
      .apply(pp)
      .where()
      .isNotNull("parent")
      .in("state", AttemptStates.asJava)
    // Both filters target the student's copy rather than the template it was made from - an exam
    // published last year can still be taken this year, and the template's own state is irrelevant.
    val attempts = withFilters(query, "course", "created", dept, start, end).distinct

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
      .isNotNull("parent")
      .isNotNull("course")
      .in("state", AttemptStates.asJava)
    val exams   = withFilters(query, "course", "created", dept, start, end).distinct
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
    val parentProps = PathProperties.parse(
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
      .eq("id", examId)
      .find
      .getOrElse(throw new RuntimeException(s"parent exam $examId not found"))

    val childProps = PathProperties.parse(
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
      .eq("parent.id", examId)
      .in("id", childIds.asJava)
      .list
    excelBuilder.streamScores(parentExam, childExams)(os)

  private def withFilters[T](
      query: ExpressionList[T],
      deptFieldPrefix: String,
      dateField: String,
      depts: List[String],
      start: Option[String],
      end: Option[String]
  ): ExpressionList[T] =
    val withDept =
      if depts.isEmpty then query else query.in(s"$deptFieldPrefix.department", depts*)
    val withStart = start.fold(withDept) { s =>
      val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
      withDept.ge(dateField, startDate.toDate)
    }
    end.fold(withStart) { e =>
      val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser()).plusDays(1)
      withStart.lt(dateField, endDate.toDate)
    }
