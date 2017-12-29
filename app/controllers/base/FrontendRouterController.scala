package controllers.base

import play.api.mvc.InjectedController

class FrontendRouterController extends InjectedController  {

  // Appends a hashbang to path and routes the request back so frontend can try to step in to handle this request
  def routeToFront(path: String) = Action { implicit request =>
    Redirect(s"/#/${request.uri}")
  }
}
