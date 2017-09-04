package controllers.assets

import com.google.inject.Inject
import controllers.Assets
import play.api.mvc.{EssentialAction, InjectedController}

class NavbarAssets @Inject()(assets: Assets) extends InjectedController {

  def at(path: String, file: String) = EssentialAction { request =>
    val Pattern = "(.*%7B%7Blink.icon_png%7D%7D)".r
    file match {
      case Pattern(x) => assets.at(path, "assets/images/1x1.png")(request)
      case _ => assets.at(path, "assets/images/nav/".concat(file))(request)
    }
  }

}
