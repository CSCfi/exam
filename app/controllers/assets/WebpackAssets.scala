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

package controllers.assets

import com.google.inject.Inject
import controllers.Assets
import play.api.{Environment, Mode}
import play.api.libs.ws.WSClient
import play.api.mvc._

class WebpackAssets @Inject()(ws: WSClient,
                              assets: Assets,
                              environment: Environment,
                              cc: ControllerComponents)
    extends AbstractController(cc) {

  def bundle(file: String): Action[AnyContent] = environment.mode match {
    case Mode.Dev =>
      import scala.concurrent.ExecutionContext.Implicits._
      Action.async {
        ws.url(s"http://localhost:8080/bundles/$file").get().map { response =>
          val contentType = response.headers
            .get("Content-Type")
            .flatMap(_.headOption)
            .getOrElse("application/octet-stream")
          val headers = response.headers
            .filter(h => List("Content-Type", "Content-Length").indexOf(h._1) < 0)
            .map(h => (h._1, h._2.mkString))
            .toSeq
          Ok(response.body).withHeaders(headers: _*).as(contentType)
        }
      }
    case _ => assets.at("/public/bundles", file)
  }

}
