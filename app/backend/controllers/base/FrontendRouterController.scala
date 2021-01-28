/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers.base

import controllers.Assets
import play.api.{Environment, Mode}
import play.api.mvc.{AbstractController, Action, AnyContent, ControllerComponents}

import javax.inject.Inject

class FrontendRouterController @Inject()(assets: Assets, cc: ControllerComponents, env: Environment)
    extends AbstractController(cc) {

  def index(): Action[AnyContent] = env.mode match {
    case Mode.Dev => assets.at("dev-index.html")
    case _        => assets.at("index.html")
  }
  // Just pass the index page and let client take it from there
  def otherwise(path: String): Action[AnyContent] = index()

}
