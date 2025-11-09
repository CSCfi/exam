// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.admin

import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.admin.GeneralSettings
import models.enrolment.ExamEnrolment
import models.user.{Language, Role, User}
import play.api.libs.json.*
import play.api.libs.ws.WSClient
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.AuthExecutionContext
import system.AuditedAction

import java.net.URI
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.Try

class SettingsController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val configReader: ConfigReader,
    val wsClient: WSClient,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with JavaApiHelper
    with DbApiHelper:

  // Helper methods
  private def get(name: String): GeneralSettings =
    DB.find(classOf[GeneralSettings])
      .where()
      .eq("name", name)
      .find
      .getOrElse(new GeneralSettings())

  // Endpoints
  def getUserAgreement: Action[AnyContent] = authenticated { _ =>
    Ok(configReader.getOrCreateSettings("eula", None, None).asJson)
  }

  def getDeadline: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(configReader.getOrCreateSettings("review_deadline", None, Some("14")).asJson)
    }

  def getReservationWindowSize: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(configReader.getOrCreateSettings("reservation_window_size", None, Some("30")).asJson)
    }

  def getMaturityInstructions(lang: String, hash: Option[String]): Action[AnyContent] = authenticated.async { _ =>
    Option(DB.find(classOf[Language], lang)) match
      case None => Future.successful(BadRequest("Language not supported"))
      case Some(language) =>
        hash match
          case Some(h) =>
            DB.find(classOf[ExamEnrolment])
              .where()
              .eq("externalExam.hash", h)
              .find match
              case None => Future.successful(BadRequest("Enrolment not found"))
              case Some(enrolment) =>
                Try(parseExternalUrl(enrolment.getReservation.getExternalRef)).toOption match
                  case None => Future.successful(BadRequest("Invalid external URL"))
                  case Some(url) =>
                    wsClient
                      .url(url.toString)
                      .addQueryStringParameters("lang" -> language.getCode)
                      .get()
                      .map { response =>
                        if response.status == OK then Ok(response.json)
                        else
                          InternalServerError(
                            (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                          )
                      }
          case None =>
            val key = s"maturity_instructions_$lang"
            Future.successful(Ok(get(key).asJson))
  }

  def provideMaturityInstructions(ref: String, lang: String): Action[AnyContent] = Action { _ =>
    Option(DB.find(classOf[Language], lang)) match
      case None => BadRequest("Language not supported")
      case Some(_) =>
        val key = s"maturity_instructions_$lang"
        Ok(get(key).asJson)
  }

  def updateUserAgreement(): Action[JsValue] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited)(parse.json) { request =>
      val eula = (request.body \ "value").as[String]
      val gs   = configReader.getOrCreateSettings("eula", Some(eula), None)

      if !(request.body \ "minorUpdate").as[Boolean] then
        // Force users to accept EULA again
        val update = DB.createUpdate(classOf[User], "update app_user set user_agreement_accepted = :hasNot")
        update.set("hasNot", false)
        update.execute()

      Ok(gs.asJson)
    }

  def setDeadline(): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { request =>
      request.body.asFormUrlEncoded.flatMap(_.get("value").flatMap(_.headOption)) match
        case Some(deadline) =>
          Ok(configReader.getOrCreateSettings("review_deadline", Some(deadline), None).asJson)
        case None => BadRequest("Missing value")
    }

  def setReservationWindowSize(): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) { request =>
      request.body.asFormUrlEncoded.flatMap(_.get("value").flatMap(_.headOption)) match
        case Some(size) =>
          Ok(configReader.getOrCreateSettings("reservation_window_size", Some(size), None).asJson)
        case None => BadRequest("Missing value")
    }

  def getHostname: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("hostname" -> configReader.getHostName))
  }

  def getMaxFilesize: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("filesize" -> configReader.getMaxFileSize))
  }

  def getExamDurations: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { _ =>
      Ok(Json.obj("examDurations" -> configReader.getExamDurations))
    }

  def getExamMaxDuration: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { _ =>
      Ok(Json.obj("maxDuration" -> configReader.getExamMaxDuration))
    }

  def getExamMinDuration: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { _ =>
      Ok(Json.obj("minDuration" -> configReader.getExamMinDuration))
    }

  def isExamGradeScaleOverridable: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { _ =>
      Ok(Json.obj("overridable" -> configReader.isCourseGradeScaleOverridable))
    }

  def isEnrolmentPermissionCheckActive: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.STUDENT))) { _ =>
      Ok(Json.obj("active" -> configReader.isEnrolmentPermissionCheckActive))
    }

  def getAppVersion: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
    Ok(Json.obj("appVersion" -> configReader.getAppVersion))
  }

  def isProd: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isProd" -> (configReader.getLoginType != "DEBUG")))
  }

  def isExamVisitSupported: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isExamVisitSupported" -> configReader.isVisitingExaminationSupported))
  }

  def isExamCollaborationSupported: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isExamCollaborationSupported" -> configReader.isCollaborationExaminationSupported))
  }

  def isAnonymousReviewEnabled: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("anonymousReviewEnabled" -> configReader.isAnonymousReviewEnabled))
  }

  def getByodSupport: Action[AnyContent] = Action { _ =>
    Ok(
      Json.obj(
        "sebExaminationSupported"  -> configReader.isSebExaminationSupported,
        "homeExaminationSupported" -> configReader.isHomeExaminationSupported
      )
    )
  }

  def getExaminationQuitLink: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { _ =>
    Ok(Json.obj("quitLink" -> configReader.getQuitExaminationLink))
  }

  def getConfig: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
    val courseIntegrationUrls = JsObject(configReader.getCourseIntegrationUrls.toSeq.map { case (k, v) =>
      k -> JsString(v)
    })

    val roles = JsObject(
      configReader.getRoleMapping.map { case (k, v) => k.getName -> JsArray(v.map(JsString(_))) }.toSeq
    )

    val eula                  = configReader.getOrCreateSettings("eula", None, None)
    val reservationWindowSize = configReader.getOrCreateSettings("reservation_window_size", None, Some("30"))
    val reviewDeadline        = configReader.getOrCreateSettings("review_deadline", None, Some("14"))

    Ok(
      Json.obj(
        "hasCourseSearchIntegration"   -> configReader.isCourseSearchActive,
        "anonymousReviewEnabled"       -> configReader.isAnonymousReviewEnabled,
        "courseSearchIntegrationUrls"  -> courseIntegrationUrls,
        "examDurations"                -> configReader.getExamDurations,
        "roles"                        -> roles,
        "eula"                         -> eula.getValue,
        "reservationWindowSize"        -> reservationWindowSize.getValue.toInt,
        "reviewDeadline"               -> reviewDeadline.getValue.toInt,
        "isExamVisitSupported"         -> configReader.isVisitingExaminationSupported,
        "isExamCollaborationSupported" -> configReader.isCollaborationExaminationSupported,
        "hasEnrolmentCheckIntegration" -> configReader.isEnrolmentPermissionCheckActive,
        "isGradeScaleOverridable"      -> configReader.isCourseGradeScaleOverridable,
        "supportsMaturity"             -> configReader.isMaturitySupported,
        "supportsPrintouts"            -> configReader.isPrintoutSupported,
        "maxFileSize"                  -> configReader.getMaxFileSize,
        "expirationPeriod"             -> configReader.getExamExpirationPeriod,
        "defaultTimeZone"              -> configReader.getDefaultTimeZone.getID,
        "sebQuitLink"                  -> configReader.getQuitExaminationLink,
        "isSebExaminationSupported"    -> configReader.isSebExaminationSupported,
        "isHomeExaminationSupported"   -> configReader.isHomeExaminationSupported
      )
    )
  }

  def getCourseCodePrefix: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("prefix" -> configReader.getCourseCodePrefix))
  }

  def getByodMaxParticipants: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) { _ =>
      Ok(Json.obj("max" -> configReader.getMaxByodExaminationParticipantCount))
    }

  private def parseExternalUrl(reservationRef: String): java.net.URL =
    URI
      .create(
        configReader.getIopHost + s"/api/enrolments/$reservationRef/instructions"
      )
      .toURL
