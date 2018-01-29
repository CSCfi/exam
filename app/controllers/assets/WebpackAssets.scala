/*
 * Copyright (c) 2018 Exam Consortium
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

package controllers.assets

import com.google.inject.Inject
import controllers.Assets
import play.api.{Environment, Mode}
import play.api.libs.ws.WSClient
import play.api.mvc._

class WebpackAssets @Inject()(ws: WSClient, assets: Assets, environment: Environment, cc: ControllerComponents)
  extends AbstractController(cc) {

  def bundle(file: String): Action[AnyContent] = if (environment.mode == Mode.Dev) Action.async {

    import scala.concurrent.ExecutionContext.Implicits._

    ws.url(s"http://localhost:8080/bundles/$file").get().map { response =>
      val contentType = response.headers.get("Content-Type").flatMap(_.headOption).getOrElse("application/octet-stream")
      val headers = response.headers
        .toSeq.filter(p => List("Content-Type", "Content-Length").indexOf(p._1) < 0).map(p => (p._1, p._2.mkString))
      Ok(response.body).withHeaders(headers: _*).as(contentType)
    }
  } else {
    assets.at("/public/bundles", file)
  }


}
