// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.admin.controllers

import features.admin.services.SettingsService
import database.EbeanJsonExtensions
import models.user.Role
import play.api.libs.json._
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}
import security.AuthExecutionContext
import system.AuditedAction

import javax.inject.Inject

class SettingsController @Inject() (
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    private val settingsService: SettingsService,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  def getUserAgreement: Action[AnyContent] = authenticated { _ =>
    Ok(settingsService.getUserAgreement.asJson)
  }

  def getDeadline: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(settingsService.getDeadline.asJson)
    }

  def getReservationWindowSize: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      Ok(settingsService.getReservationWindowSize.asJson)
    }

  def getMaturityInstructions(lang: String, hash: Option[String]): Action[AnyContent] =
    authenticated.async { _ =>
      settingsService.getMaturityInstructions(lang, hash).map {
        case Left(error) => BadRequest(error)
        case Right(json) => Ok(json)
      }
    }

  def provideMaturityInstructions(ref: String, lang: String): Action[AnyContent] = audited { _ =>
    settingsService.provideMaturityInstructions(lang) match
      case None           => BadRequest("Language not supported")
      case Some(settings) => Ok(settings.asJson)
  }

  def updateUserAgreement(): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited)(
      parse.json
    ) { request =>
      val eula        = (request.body \ "value").as[String]
      val minorUpdate = (request.body \ "minorUpdate").as[Boolean]
      val gs          = settingsService.updateUserAgreement(eula, minorUpdate)
      Ok(gs.asJson)
    }

  def setDeadline(): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) {
      request =>
        request.body.asFormUrlEncoded.flatMap(_.get("value").flatMap(_.headOption)) match
          case Some(deadline) => Ok(settingsService.setDeadline(deadline).asJson)
          case None           => BadRequest("Missing value")
    }

  def setReservationWindowSize(): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN))).andThen(audited) {
      request =>
        request.body.asFormUrlEncoded.flatMap(_.get("value").flatMap(_.headOption)) match
          case Some(size) => Ok(settingsService.setReservationWindowSize(size).asJson)
          case None       => BadRequest("Missing value")
    }

  def getHostname: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("hostname" -> settingsService.getHostname))
  }

  def getMaxFilesize: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("filesize" -> settingsService.getMaxFilesize))
  }

  def getExamDurations: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("examDurations" -> settingsService.getExamDurations))
    }

  def getExamMaxDuration: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("maxDuration" -> settingsService.getExamMaxDuration))
    }

  def getExamMinDuration: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("minDuration" -> settingsService.getExamMinDuration))
    }

  def isExamGradeScaleOverridable: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("overridable" -> settingsService.isExamGradeScaleOverridable))
    }

  def isEnrolmentPermissionCheckActive: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER, Role.Name.STUDENT))) {
      _ =>
        Ok(Json.obj("active" -> settingsService.isEnrolmentPermissionCheckActive))
    }

  def getAppVersion: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      Ok(Json.obj("appVersion" -> settingsService.getAppVersion))
    }

  def isProd: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isProd" -> settingsService.isProd))
  }

  def isExamVisitSupported: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isExamVisitSupported" -> settingsService.isExamVisitSupported))
  }

  def isExamCollaborationSupported: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("isExamCollaborationSupported" -> settingsService.isExamCollaborationSupported))
  }

  def isAnonymousReviewEnabled: Action[AnyContent] = Action { _ =>
    Ok(Json.obj("anonymousReviewEnabled" -> settingsService.isAnonymousReviewEnabled))
  }

  def getByodSupport: Action[AnyContent] = Action { _ =>
    val (sebSupported, homeSupported) = settingsService.getByodSupport
    Ok(Json.obj(
      "sebExaminationSupported"  -> sebSupported,
      "homeExaminationSupported" -> homeSupported
    ))
  }

  def getExaminationQuitLink: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { _ =>
      Ok(Json.obj("quitLink" -> settingsService.getExaminationQuitLink))
    }

  def getConfig: Action[AnyContent] = authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
    Ok(settingsService.getConfig)
  }

  def getCourseCodePrefix: Action[AnyContent] = authenticated { _ =>
    Ok(Json.obj("prefix" -> settingsService.getCourseCodePrefix))
  }

  def getByodMaxParticipants: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("max" -> settingsService.getByodMaxParticipants))
    }

  def areNewMultichoiceFeaturesEnabled: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER))) {
      _ =>
        Ok(Json.obj("multichoiceFeaturesOn" -> settingsService.areNewMultichoiceFeaturesEnabled))
    }
