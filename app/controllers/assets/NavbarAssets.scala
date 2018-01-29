/*
 * Copyright (c) 2017 Exam Consortium
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
import play.api.mvc.{EssentialAction, InjectedController}

class NavbarAssets @Inject()(assets: Assets) extends InjectedController {

  def at(path: String, file: String) = EssentialAction { request =>
    val Pattern = "(.*%7B%7Blink.iconPng%7D%7D)".r
    file match {
      case Pattern(_) => assets.at(path, "assets/images/1x1.png")(request)
      case _ => assets.at(path, "assets/images/nav/".concat(file))(request)
    }
  }

}
