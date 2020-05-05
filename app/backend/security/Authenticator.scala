package backend.security

import backend.models.{Session, User}
import com.typesafe.config.ConfigFactory
import io.ebean.Ebean
import play.api.cache.SyncCacheApi
import play.api.mvc.{AnyContent, Request, Result, Results}

trait Authenticator {

  def LOGIN_TYPE: String = ConfigFactory.load.getString("sitnet.login")
  def AUTH_HEADER: String = LOGIN_TYPE match {
    case "HAKA" => "Shib-Session-Id"
    case _      => "x-exam-authentication"
  }
  def SESSION_CACHE_KEY = "user.session."

  def sessionCache: SyncCacheApi

  def getSession(token: String): Option[Session] =
    sessionCache.get[Session](SESSION_CACHE_KEY + token)

  def forbid(): Result = Results.Unauthorized("Unauthorized")

  def getLoggedUser(request: Request[AnyContent]): Option[(Session, User)] =
    request.headers
      .get(AUTH_HEADER)
      .flatMap(token => getSession(token).map(s => (s, Ebean.find(classOf[User], s.getUserId))))

  def getAuthorizedUser(request: Request[AnyContent], roles: Seq[String]): Option[(Session, User)] =
    getLoggedUser(request) match {
      case Some(x) if roles.isEmpty || roles.contains(x._1.getLoginRole) => Some(x)
      case _                                                             => None
    }

}
