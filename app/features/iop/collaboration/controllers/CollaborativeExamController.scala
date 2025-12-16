// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import features.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam._
import models.iop.CollaborativeExam
import models.sections.ExamSection
import models.user.{Language, Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.data.validation.{Constraints, Invalid}
import play.api.libs.json.Json._
import play.api.libs.json._
import play.api.libs.ws.JsonBodyWritables
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized, subjectNotPresent}
import services.config.ConfigReader
import services.exam.ExamUpdater
import services.mail.EmailComposer
import system.AuditedAction
import validation.exam.ExamValidator

import javax.inject.Inject
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._

class CollaborativeExamController @Inject() (
    wsClient: play.api.libs.ws.WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoader,
    configReader: ConfigReader,
    emailComposer: EmailComposer,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    override val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends CollaborationController(wsClient, examUpdater, examLoader, configReader, controllerComponents)
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with JsonBodyWritables
    with Logging:

  // Helper to convert Play JSON to Jackson JSON (for models that still use Jackson)
  private def toJacksonJson(value: play.api.libs.json.JsValue): com.fasterxml.jackson.databind.JsonNode =
    play.libs.Json.parse(play.api.libs.json.Json.stringify(value))

  private def prepareDraft(user: User): Exam =
    val examExecutionType = DB
      .find(classOf[ExamExecutionType])
      .where()
      .eq("type", ExamExecutionType.Type.PUBLIC.toString)
      .findOne()

    val exam = new Exam()
    exam.generateHash()
    exam.setState(Exam.State.DRAFT)
    exam.setExecutionType(examExecutionType)
    cleanUser(user)
    exam.setCreatorWithDate(user)

    val examSection = new ExamSection()
    examSection.setCreatorWithDate(user)
    examSection.setId(newId())
    examSection.setExam(exam)
    examSection.setExpanded(true)
    examSection.setSequenceNumber(0)

    exam.getExamSections.add(examSection)

    exam.getExamLanguages.add(DB.find(classOf[Language], "fi"))
    exam.setExamType(DB.find(classOf[ExamType], 2)) // Final
    exam.setGradeScale(DB.find(classOf[GradeScale]).list.head)

    val start = DateTime.now().withTimeAtStartOfDay()
    exam.setPeriodStart(start)
    exam.setPeriodEnd(start.plusDays(1))
    exam.setDuration(configReader.getExamDurationsJava.asScala.head)

    exam.setTrialCount(1)
    exam.setAnonymous(true)
    exam.setGradingType(Grade.Type.GRADED)

    exam

  def searchExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      val user      = request.attrs(Auth.ATTR_USER)
      val homeOrg   = configReader.getHomeOrganisationRef
      val wsRequest = getSearchRequest(filter)

      wsRequest.get().map { response =>
        findExamsToProcess(response) match
          case Left(result) => result
          case Right(items) =>
            val exams = items
              .filter { case (ce, rev) =>
                // Deserialize to check authorization
                val exam = ce.getExam(toJacksonJson(rev))
                isAuthorizedToView(exam, user, homeOrg)
              }
              .map { case (ce, rev) =>
                // Add local database ID to the JSON response
                // The external service uses _id (CouchDB style), but we need the local database id
                val jsonObj = rev.as[JsObject]
                // Ensure the local database id is set (overwrite any existing id field)
                jsonObj + ("id" -> JsNumber(BigDecimal(ce.getId)))
              }
              .toSeq

            Ok(JsArray(exams))
      }
    }

  private def getExam(id: Long, postProcessor: Exam => Unit, user: User): Future[Result] =
    val homeOrg = configReader.getHomeOrganisationRef
    findCollaborativeExam(id) match
      case Left(errorResult) => errorResult
      case Right(ce) =>
        examLoader.downloadExamJson(ce).map {
          case None       => NotFound("i18n_error_exam_not_found")
          case Some(root) =>
            // Deserialize to check authorization
            val jacksonNode = play.libs.Json.parse(Json.stringify(root))
            val exam        = ce.getExam(jacksonNode)
            if !isAuthorizedToView(exam, user, homeOrg) then NotFound("i18n_error_exam_not_found")
            else
              postProcessor(exam)
              // Add local database ID to the JSON response
              val jsonObj    = root.as[JsObject]
              val jsonWithId = jsonObj + ("id" -> JsNumber(BigDecimal(ce.getId)))
              Ok(jsonWithId)
        }

  def listGradeScales(): Action[AnyContent] =
    controllerComponents.actionBuilder.andThen(subjectNotPresent) { _ =>
      val grades = DB
        .find(classOf[GradeScale])
        .fetch("grades")
        .where()
        .isNull("externalRef")
        .distinct
      Ok(grades.asJson)
    }

  def getExam(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      getExam(id, _ => (), request.attrs(Auth.ATTR_USER))
    }

  def getExamPreview(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      getExam(id, exam => examUpdater.preparePreview(exam), request.attrs(Auth.ATTR_USER))
    }

  def createExam(): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      parseUrl() match
        case None => Future.successful(InternalServerError)
        case Some(url) =>
          val user      = request.attrs(Auth.ATTR_USER)
          val body      = prepareDraft(user)
          val wsRequest = wsClient.url(url.toString)

          wsRequest.post(body.asJson).map { response =>
            if response.status != CREATED then
              InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
            else
              val externalRef = (response.json \ "id").as[String]
              val revision    = (response.json \ "rev").as[String]
              val ce          = new CollaborativeExam()
              ce.setExternalRef(externalRef)
              ce.setRevision(revision)
              ce.setCreated(DateTime.now())
              ce.setAnonymous(true)
              ce.save()
              Created(Json.obj("id" -> JsNumber(BigDecimal(ce.getId))))
          }
    }

  def deleteExam(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { _ =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) if ce.getState != Exam.State.DRAFT && ce.getState != Exam.State.PRE_PUBLISHED =>
          Future.successful(Forbidden("i18n_exam_removal_not_possible"))
        case Right(ce) =>
          examLoader.deleteExam(ce).map { result =>
            if result.header.status == Ok.header.status then ce.delete()
            result
          }
    }

  def updateExam(id: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      // Validate the exam payload
      ExamValidator.forUpdate(request.body) match
        case Left(ex) => Future.successful(BadRequest(ex.getMessage))
        case Right(payload) =>
          val homeOrg = configReader.getHomeOrganisationRef
          findCollaborativeExam(id) match
            case Left(errorResult) => errorResult
            case Right(ce) =>
              val user = request.attrs(Auth.ATTR_USER)

              examLoader.downloadExam(ce).flatMap {
                case None => Future.successful(NotFound("i18n_error_exam_not_found"))
                case Some(exam) if !isAuthorizedToView(exam, user, homeOrg) =>
                  Future.successful(Forbidden("i18n_error_access_forbidden"))
                case Some(exam) =>
                  val previousState = exam.getState

                  // Validate temporal fields and state
                  val error = Seq(
                    examUpdater.updateTemporalFieldsAndValidate(exam, user, payload),
                    examUpdater.updateStateAndValidate(exam, user, payload)
                  ).flatten.headOption

                  error match
                    case Some(err) => Future.successful(err)
                    case None =>
                      val nextState = exam.getState
                      val isPrePublication =
                        previousState != Exam.State.PRE_PUBLISHED && nextState == Exam.State.PRE_PUBLISHED

                      examUpdater.update(exam, payload, user.getLoginRole)

                      examLoader.uploadExam(ce, exam, user).map { result =>
                        if result.header.status == Ok.header.status && isPrePublication then
                          val receivers = exam.getExamOwners.asScala.map(_.getEmail).toSet
                          emailComposer.scheduleEmail(1.second) {
                            emailComposer.composeCollaborativeExamAnnouncement(receivers, user, exam)
                          }
                        result
                      }
              }
    }

  def updateLanguage(id: Long, code: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          val user = request.attrs(Auth.ATTR_USER)
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound("i18n_error_exam_not_found"))
            case Some(exam) =>
              examUpdater.updateLanguage(exam, code, user) match
                case Some(error) => Future.successful(error)
                case None        => examLoader.uploadExam(ce, exam, user)
          }
    }

  def addOwner(id: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          val user = request.attrs(Auth.ATTR_USER)
          (request.body \ "email").asOpt[String] match
            case None        => Future.successful(BadRequest("i18n_error_email_missing"))
            case Some(email) =>
              // Validate email
              Constraints.emailAddress()(email) match
                case Invalid(_) => Future.successful(BadRequest("i18n_error_email_invalid"))
                case _ =>
                  examLoader.downloadExam(ce).flatMap {
                    case None => Future.successful(NotFound("i18n_error_exam_not_found"))
                    case Some(exam) =>
                      val owner = createOwner(email)
                      exam.getExamOwners.add(owner)
                      examLoader.uploadExam(ce, exam, user, owner, null)
                  }
    }

  def removeOwner(id: Long, oid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).async { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          val user = request.attrs(Auth.ATTR_USER)
          examLoader.downloadExam(ce).flatMap {
            case None => Future.successful(NotFound("i18n_error_exam_not_found"))
            case Some(exam) =>
              val owner = new User()
              owner.setId(oid)
              exam.getExamOwners.remove(owner)
              examLoader.uploadExam(ce, exam, user)
          }
    }

  private def createOwner(email: String): User =
    val user = new User()
    user.setId(newId())
    user.setEmail(email)
    user
