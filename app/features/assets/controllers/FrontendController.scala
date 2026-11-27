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

/** Headers that allow 304 Not Modified; removing them forces a full 200 so the client always gets
  * fresh HTML.
  */
private val ValidationHeaders = Set("ETag", "Last-Modified")

class FrontendController @Inject() (assets: Assets, val controllerComponents: ControllerComponents)
    extends BaseController:
  private implicit val ec: ExecutionContext = controllerComponents.executionContext

  def index: Action[AnyContent] = Action.async { request =>
    assets.at("index.html").apply(request).map { result =>
      val withoutValidation =
        result.copy(header =
          result.header.copy(headers = result.header.headers -- ValidationHeaders)
        )
      withoutValidation.withHeaders(NoCacheHeaders*)
    }
  }
  def assetOrDefault(resource: String): Action[AnyContent] =
    if resource.contains(".") then assets.at(resource) else index
