// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.controllers

import database.EbeanJsonExtensions
import features.user.services.LanguageService
import models.user.Role
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import javax.inject.Inject

class LanguageController @Inject() (
    private val languageService: LanguageService,
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController
    with EbeanJsonExtensions:

  def listSupportedLanguages: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) {
      _ =>
        Ok(languageService.listSupportedLanguages.asJson)
    }
