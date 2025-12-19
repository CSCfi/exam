// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.controllers

import features.user.services.LanguageService
import database.EbeanJsonExtensions
import models.user.Role
import play.api.mvc._
import security.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class LanguageController @Inject() (
    private val languageService: LanguageService,
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with EbeanJsonExtensions:

  def listSupportedLanguages: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        Ok(languageService.listSupportedLanguages.asJson)
    }
