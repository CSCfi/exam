package backend.security

import backend.models.User
import io.ebean.Ebean
import play.api.mvc.{AnyContent, Request, Result, Results}

trait Authenticator {

  def forbid(): Result = Results.Unauthorized("Unauthorized")

  def getAuthorizedUser(request: Request[AnyContent], roles: Seq[String]): Option[User] = {
    val role = request.session.get("role")
    val id   = request.session.get("id")
    (role, id) match {
      case (Some(r), Some(id)) if roles.isEmpty || roles.contains(r) =>
        Some(Ebean.find(classOf[User], id))
      case _ => None
    }
  }
}
