// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.user

import io.ebean.DB
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.user.{Language, Role}
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class LanguageController @Inject() (
    authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def listSupportedLanguages: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Ok(DB.find(classOf[Language]).list.asJson)
    }
