package controllers.assets

import controllers.Assets
import play.api.mvc._

import javax.inject._

@Singleton
class FrontendController @Inject()(assets: Assets, cc: ControllerComponents)
    extends AbstractController(cc) {

  def index: Action[AnyContent] = assets.at("index.html")

  def assetOrDefault(resource: String): Action[AnyContent] =
    if (resource.contains(".")) assets.at(resource) else index

}
