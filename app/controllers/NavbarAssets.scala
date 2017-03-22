package controllers

import play.api.mvc.EssentialAction
import play.mvc.Controller

class NavbarAssets extends Controller {

  def at(path: String, file: String) = EssentialAction { request =>
    val Pattern = "(.*%7B%7Blink.icon_png%7D%7D)".r
    file match {
      case Pattern(x) => controllers.Assets.at(path, "assets/images/1x1.png")(request)
      case _ => controllers.Assets.at(path, file)(request)
    }
  }

}
