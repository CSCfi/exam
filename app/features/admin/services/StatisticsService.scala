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
      .isNotNull("department")
      .distinct
      .map(_.department)
      .toList

  def listParticipations(
      dept: Option[String],
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
    val enrolments = DB
      .find(classOf[ExamEnrolment])
      .apply(pp)
      .where()
      .or()
      .ne("exam.state", ExamState.PUBLISHED)
      .isNotNull("externalExam.started")
      .endOr()
      .isNotNull("reservation.machine")
      .ne("noShow", true)
      .distinct

    // The participation date lives on either the local or the external exam, so the department and
    // date filters cannot be pushed into the query - apply them in memory instead.
    def participationDate(enrolment: ExamEnrolment) =
      Option(enrolment.externalExam).map(_.started).getOrElse(enrolment.exam.created)

    def matchesFilters(enrolment: ExamEnrolment) =
      val date = participationDate(enrolment)
      val deptMatches = dept.forall { d =>
        // External exams carry no local course, hence no department to match against
        Option(enrolment.externalExam).isEmpty &&
        Option(enrolment.exam.course).exists(c => d.split(",").contains(c.department))
      }
      deptMatches &&
      start.forall(s => TimeUtils.parseInstant(s).isBefore(date)) &&
      end.forall(e => TimeUtils.parseInstant(e).plus(Duration.ofDays(1)).isAfter(date))

    val roomMap = enrolments
      .filter(matchesFilters)
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
      dept: Option[String],
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
      dept: Option[String],
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
      dept: Option[String],
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
      dept: Option[String],
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
      depts: Option[String],
      start: Option[String],
      end: Option[String]
  ): ExpressionList[T] =
    val withDept = depts.fold(query) { d =>
      val deptList = d.split(",").toList
      query.in(s"$deptFieldPrefix.department", deptList*)
    }
    val withStart = start.fold(withDept) { s =>
      withDept.ge(dateField, TimeUtils.parseInstant(s))
    }
    end.fold(withStart) { e =>
      withStart.lt(
        dateField,
        TimeUtils.parseInstant(e).plus(Duration.ofDays(1))
      )
    }
