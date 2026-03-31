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
    val roomMap = enrolments
      .groupBy { enrolment =>
        val room = enrolment.reservation.machine.room
        s"${room.id}___${room.name}"
      }
      .view
      .mapValues { enrolmentList =>
        enrolmentList.map { enrolment =>
          val examStart = Option(enrolment.externalExam)
            .map(_.started)
            .getOrElse(enrolment.exam.created)
          Participation(examStart)
        }.toSet
      }
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
    val query = DB.find(classOf[ExamEnrolment]).where()
    val enrolments =
      withFilters(query, "exam.course", "reservation.startAt", dept, start, end).distinct
    enrolments.partition(_.noShow) match
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

  def listPublishedExams(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): List[ExamInfo] =
    val query = DB
      .find(classOf[Exam])
      .fetch("course", "code")
      .where()
      .isNull("parent")
      .isNotNull("course")
      .in("state", ExamState.PUBLISHED, ExamState.DELETED, ExamState.ARCHIVED)
    val exams = withFilters(query, "course", "created", dept, start, end).distinct

    def examFilter(exam: Exam) =
      val created          = exam.created
      val hasValidState    = exam.state.ordinal() > ExamState.PUBLISHED.ordinal()
      val hasParticipation = Option(exam.examParticipation).isDefined
      hasValidState &&
      hasParticipation &&
      start.forall(s => TimeUtils.parseInstant(s).isBefore(created)) &&
      end.forall(e => TimeUtils.parseInstant(e).plus(Duration.ofDays(1)).isAfter(created))

    exams.map(e =>
      ExamInfo(s"[${e.course.code}] ${e.name}", e.children.asScala.count(examFilter))
    ).toList

  def listResponses(
      dept: Option[String],
      start: Option[String],
      end: Option[String]
  ): (Int, Int, Int) =
    val query   = DB.find(classOf[Exam]).where().isNotNull("parent").isNotNull("course")
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
      ExamState.INITIALIZED,
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
