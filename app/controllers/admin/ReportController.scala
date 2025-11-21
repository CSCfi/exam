// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.admin

import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import miscellaneous.excel.ExcelBuilder
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Course, Exam}
import models.facility.ExamRoom
import models.user.Role
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.libs.json.{Json, Writes}
import play.api.mvc.*
import security.scala.Auth.authorized
import security.scala.AuthExecutionContext
import system.AuditedAction
import validation.scala.core.{ScalaAttrs, Validators}
import validation.scala.CommaJoinedListValidator

import java.util.Base64
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.{Failure, Success, Try}

class ReportController @Inject() (
    val controllerComponents: ControllerComponents,
    val excelBuilder: ExcelBuilder,
    validators: Validators,
    audited: AuditedAction,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  case class ExamInfo(name: String, participations: Int)
  object ExamInfo:
    implicit val writes: Writes[ExamInfo] = Json.writes[ExamInfo]

  case class Participation(date: String)
  object Participation:
    def apply(dateTime: DateTime): Participation =
      Participation(ISODateTimeFormat.dateTime.print(dateTime))
    implicit val writes: Writes[Participation] = Json.writes[Participation]

  private val XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

  def listDepartments: Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val departments = DB
        .find(classOf[Course])
        .where()
        .isNotNull("department")
        .distinct
        .map(_.getDepartment)
      Ok(Json.obj("departments" -> Json.toJson(departments)))
    }

  def listParticipations(dept: Option[String], start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
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
          }
        }
        .toMap

      // Fill in rooms with no participations

      val allRooms = DB.find(classOf[ExamRoom]).where().eq("outOfService", false).list
      val completeRoomMap = allRooms.foldLeft(roomMap) { (map, room) =>
        val key = s"${room.getId}___${room.getName}"
        if (map.contains(key)) map else map + (key -> Set.empty[Participation])
      }

      Ok(Json.toJson(completeRoomMap))
    }

  def listReservations(dept: Option[String], start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val query = DB.find(classOf[ExamEnrolment]).where()
      val enrolments =
        withFilters(query, "exam.course", "reservation.startAt", dept, start, end).distinct
      val (noShows, appearances) = enrolments.partition(_.isNoShow) match
        case (a, b) => (a.size, b.size)
      Ok(Json.obj("noShows" -> noShows, "appearances" -> appearances))
    }

  def listIopReservations(dept: Option[String], start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val pp    = PathProperties.parse("*, enrolment(noShow, externalExam(finished)), externalReservation(*)")
      val query = DB.find(classOf[Reservation]).where().apply(pp)
      val el    = query.where().isNotNull("externalRef")
      val reservations = withFilters(el, "enrolment.exam.course", "startAt", dept, start, end).distinct.filter(r =>
        Option(r.getExternalOrgName).isDefined || Option(r.getExternalReservation).isDefined
      )
      Ok(reservations.asJson)
    }

  def listPublishedExams(dept: Option[String], start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
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

      val infos =
        exams.map(e => ExamInfo(s"[${e.getCourse.getCode}] ${e.getName}", e.getChildren.asScala.count(examFilter)))
      Ok(Json.toJson(infos))
    }

  def listResponses(dept: Option[String], start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
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
      Ok(Json.obj("aborted" -> aborted, "assessed" -> assessed, "unassessed" -> unassessed))
    }

  def exportExamQuestionScoresAsExcel(examId: Long): Action[AnyContent] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(validators.validated(CommaJoinedListValidator))
      .andThen(audited) { request =>
        val childIds = request.attrs(ScalaAttrs.ID_LIST)
        Try(excelBuilder.buildScoreExcel(examId, childIds)) match
          case Success(bos) =>
            val encoded = Base64.getEncoder.encodeToString(bos.toByteArray)
            Ok(encoded)
              .withHeaders("Content-Disposition" -> "attachment; filename=\"exam_records.xlsx\"")
              .as(XLSX_MIME)
          case Failure(_) =>
            InternalServerError("i18n_error_creating_csv_file")
      }

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
