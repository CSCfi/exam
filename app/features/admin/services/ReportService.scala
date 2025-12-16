// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.services

import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Course, Exam}
import models.facility.ExamRoom
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.{Json, Writes}
import services.excel.ExcelBuilder

import javax.inject.Inject
import scala.jdk.CollectionConverters._
import scala.util.Try

class ReportService @Inject() (
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
      .map(_.getDepartment)
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
      .where
      .apply(pp)
      .where()
      .or()
      .ne("exam.state", Exam.State.PUBLISHED)
      .isNotNull("externalExam.started")
      .endOr()
      .isNotNull("reservation.machine")
      .ne("noShow", true)
      .distinct
    val roomMap = enrolments
      .groupBy { enrolment =>
        val room = enrolment.getReservation.getMachine.getRoom
        s"${room.getId}___${room.getName}"
      }
      .view
      .mapValues { enrolmentList =>
        enrolmentList.map { enrolment =>
          val examStart = Option(enrolment.getExternalExam)
            .map(_.getStarted)
            .getOrElse(enrolment.getExam.getCreated)
          Participation(examStart)
        }.toSet
      }
      .toMap

    // Fill in rooms with no participations
    val allRooms = DB.find(classOf[ExamRoom]).where().eq("outOfService", false).list
    allRooms.foldLeft(roomMap) { (map, room) =>
      val key = s"${room.getId}___${room.getName}"
      if map.contains(key) then map else map + (key -> Set.empty[Participation])
    }

  def listReservations(dept: Option[String], start: Option[String], end: Option[String]): (Int, Int) =
    val query = DB.find(classOf[ExamEnrolment]).where()
    val enrolments =
      withFilters(query, "exam.course", "reservation.startAt", dept, start, end).distinct
    enrolments.partition(_.isNoShow) match
      case (a, b) => (a.size, b.size)

  def listIopReservations(dept: Option[String], start: Option[String], end: Option[String]): List[Reservation] =
    val pp    = PathProperties.parse("*, enrolment(noShow, externalExam(finished)), externalReservation(*)")
    val query = DB.find(classOf[Reservation]).where().apply(pp)
    val el    = query.where().isNotNull("externalRef")
    withFilters(el, "enrolment.exam.course", "startAt", dept, start, end).distinct
      .filter(r => Option(r.getExternalOrgName).isDefined || Option(r.getExternalReservation).isDefined)
      .toList

  def listPublishedExams(dept: Option[String], start: Option[String], end: Option[String]): List[ExamInfo] =
    val query = DB
      .find(classOf[Exam])
      .fetch("course", "code")
      .where()
      .isNull("parent")
      .isNotNull("course")
      .in("state", Exam.State.PUBLISHED, Exam.State.DELETED, Exam.State.ARCHIVED)
    val exams = withFilters(query, "course", "created", dept, start, end).distinct

    def examFilter(exam: Exam) =
      val created          = exam.getCreated
      val hasValidState    = exam.getState.ordinal() > Exam.State.PUBLISHED.ordinal()
      val hasParticipation = Option(exam.getExamParticipation).isDefined
      hasValidState &&
      hasParticipation &&
      start.forall(s => DateTime.parse(s, ISODateTimeFormat.dateTimeParser()).isBefore(created)) &&
      end.forall(e => DateTime.parse(e, ISODateTimeFormat.dateTimeParser()).plusDays(1).isAfter(created))

    exams.map(e => ExamInfo(s"[${e.getCourse.getCode}] ${e.getName}", e.getChildren.asScala.count(examFilter))).toList

  def listResponses(dept: Option[String], start: Option[String], end: Option[String]): (Int, Int, Int) =
    val query   = DB.find(classOf[Exam]).where().isNotNull("parent").isNotNull("course")
    val exams   = withFilters(query, "course", "created", dept, start, end).distinct
    val aborted = exams.count(e => e.getState == Exam.State.ABORTED)
    val assessed = exams.count(e =>
      e.hasState(
        Exam.State.GRADED,
        Exam.State.GRADED_LOGGED,
        Exam.State.ARCHIVED,
        Exam.State.REJECTED,
        Exam.State.DELETED
      )
    )
    val unassessed = exams.count(e =>
      e.hasState(
        Exam.State.INITIALIZED,
        Exam.State.STUDENT_STARTED,
        Exam.State.REVIEW,
        Exam.State.REVIEW_STARTED
      )
    )
    (aborted, assessed, unassessed)

  def exportExamQuestionScoresAsExcel(examId: Long, childIds: List[Long]): Try[Array[Byte]] =
    Try(excelBuilder.buildScoreExcel(examId, childIds).toByteArray)

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
      val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
      withDept.ge(dateField, startDate.toDate)
    }
    end.fold(withStart) { e =>
      val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser()).plusDays(1)
      withStart.lt(dateField, endDate.toDate)
    }
