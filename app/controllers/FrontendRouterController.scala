package controllers

import play.api.mvc.{Action, Controller}

class FrontendRouterController extends Controller  {

  // Appends a hashbang to path and routes the request back so frontend can try to step in to handle this request
  def routeToFront(path: String) = Action {
    Redirect(s"/#/$path")
  }
}
