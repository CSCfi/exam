// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assets.controllers

import controllers.Assets
import play.api.mvc.*

import javax.inject.Inject
import scala.concurrent.ExecutionContext

/** Headers so the browser does not cache index.html. Cached HTML would reference old hashed bundle
  * filenames after deploy and cause 404s until hard refresh.
  */
private val NoCacheHeaders = Seq(
  "Cache-Control" -> "no-cache, no-store, must-revalidate",
  "Pragma"        -> "no-cache",
  "Expires"       -> "0"
)

class FrontendController @Inject() (assets: Assets, val controllerComponents: ControllerComponents)
    extends BaseController:
  private implicit val ec: ExecutionContext = controllerComponents.executionContext

  def index: Action[AnyContent] = Action.async { request =>
    assets.at("index.html").apply(request).map(_.withHeaders(NoCacheHeaders*))
  }
  def assetOrDefault(resource: String): Action[AnyContent] =
    if resource.contains(".") then assets.at(resource) else index
