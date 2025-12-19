// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.controllers

import system.interceptors.AnonymousHandler
import features.exam.services.{ExamError, ExamService}
import io.ebean.text.PathProperties
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json.{JsNumber, JsValue, Json}
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.AnonymousJsonFilter

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class ExamController @Inject() (
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    anonymousJsonFilter: AnonymousJsonFilter,
    private val examService: ExamService,
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with EbeanJsonExtensions
    with AnonymousHandler:

  private def toResult(error: ExamError): Result =
    error match
      case ExamError.NotFound                 => NotFound("i18n_error_exam_not_found")
      case ExamError.AccessForbidden          => Forbidden("i18n_error_access_forbidden")
      case ExamError.ExamRemovalNotPossible   => Forbidden("i18n_exam_removal_not_possible")
      case ExamError.FutureReservationsExist  => Forbidden("i18n_error_future_reservations_exist")
      case ExamError.CourseNotActive          => Forbidden("i18n_error_course_not_active")
      case ExamError.NoRequiredSoftwares      => BadRequest("i18n_no_required_softwares")
      case ExamError.ExecutionTypeNotFound    => NotFound("i18n_execution_type_not_found")
      case ExamError.UnsupportedExecutionType => BadRequest("Unsupported execution type")
      case ExamError.NoPermissionToCreateByodExam => Forbidden("i18n_access_forbidden")
      case ExamError.ValidationError(message)     => BadRequest(message)
      case ExamError.UpdateError(result)          => result

  def searchExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val exams = examService.searchExams(filter, user)
      Future.successful(Ok(exams.asJson))
    }

  def listPrintouts(): Action[AnyContent] =
    Action { _ =>
      val printouts = examService.listPrintouts()
      val pp = PathProperties.parse(
        "(id, name, course(code), examinationDates(date), examOwners(firstName, lastName))"
      )
      Ok(printouts.asJson(pp))
    }

  def listExams(
      courseIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val exams = examService.listExams(user, courseIds, sectionIds, tagIds, ownerIds)
      val pp = PathProperties.parse(
        "(id, name, periodStart, periodEnd, course(id, code), examSections(id, name))"
      )
      Future.successful(Ok(exams.asJson(pp)))
    }

  def getTeachersExams: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER))).async { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val exams = examService.getTeachersExams(user)
      val props = PathProperties.parse(
        "(*, course(id, code), " +
          "children(id, state, examInspections(user(id, firstName, lastName))), " +
          "examinationDates(*), " +
          "examOwners(id, firstName, lastName), executionType(type), " +
          "examInspections(id, user(id, firstName, lastName)), " +
          "examEnrolments(id, user(id), reservation(id, endAt), examinationEventConfiguration(examinationEvent(start))))"
      )
      Future.successful(Ok(exams.asJson(props)))
    }

  def deleteExam(id: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examService.deleteExam(id, user) match
        case Left(error) => Future.successful(toResult(error))
        case Right(_)    => Future.successful(Ok)
    }

  def getExam(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(anonymousJsonFilter.apply(Set("user")))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.getExam(id, user) match
          case Left(error) => Future.successful(toResult(error))
          case Right(exam) =>
            Future.successful(writeAnonymousResult(request, Ok(exam.asJson), exam.isAnonymous))
      }

  def getExamTypes: Action[AnyContent] =
    Action { _ =>
      Ok(examService.getExamTypes().asJson)
    }

  def getExamGradeScales: Action[AnyContent] =
    Action { _ =>
      Ok(examService.getExamGradeScales().asJson)
    }

  def getExamExecutionTypes: Action[AnyContent] =
    Action { _ =>
      Ok(examService.getExamExecutionTypes().asJson)
    }

  def getExamPreview(id: Long): Action[AnyContent] =
    authenticated.andThen(
      authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))
    ).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      examService.getExamPreview(id, user) match
        case Left(error) => Future.successful(toResult(error))
        case Right(exam) => Future.successful(Ok(exam.asJson))
    }

  def updateExam(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.updateExam(id, user, request.body) match
          case Left(error) => Future.successful(toResult(error))
          case Right(exam) => Future.successful(Ok(exam.asJson))
      }

  def updateExamSoftware(eid: Long, sid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.updateExamSoftware(eid, sid, user) match
          case Left(error) => Future.successful(toResult(error))
          case Right(_)    => Future.successful(Ok)
      }

  def updateExamLanguage(eid: Long, code: String): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.updateExamLanguage(eid, code, user) match
          case Left(error) => Future.successful(toResult(error))
          case Right(_)    => Future.successful(Ok)
      }

  def copyExam(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async { request =>
        val user             = request.attrs(Auth.ATTR_USER)
        val formData         = request.body.asFormUrlEncoded.getOrElse(Map.empty)
        val examinationType  = formData.get("examinationType").flatMap(_.headOption)
        val executionTypeStr = formData.get("type").flatMap(_.headOption)
        examService.copyExam(id, user, examinationType, executionTypeStr) match
          case Left(error) => Future.successful(toResult(error))
          case Right(copy) => Future.successful(Ok(copy.asJson))
      }

  def createExamDraft(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.createExamDraft(user, request.body) match
          case Left(error) => Future.successful(toResult(error))
          case Right(examId) =>
            Future.successful(Ok(Json.obj("id" -> JsNumber(BigDecimal(examId)))))
      }

  def updateCourse(eid: Long, cid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        examService.updateCourse(eid, cid, user) match
          case Left(error) => Future.successful(toResult(error))
          case Right(_)    => Future.successful(Ok)
      }
