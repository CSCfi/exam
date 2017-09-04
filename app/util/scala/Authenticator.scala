package util.scala

import io.ebean.Ebean
import com.typesafe.config.ConfigFactory
import models.{Session, User}
import play.api.cache.SyncCacheApi
import play.api.mvc.Results


trait Authenticator {

  val LOGIN_TYPE = ConfigFactory.load.getString("sitnet.login")

  val SITNET_CACHE_KEY = "user.session."

  val sessionCache: SyncCacheApi

  def getAuthHeaderName: String = LOGIN_TYPE match {
    case "HAKA" => "Shib-Session-Id"
    case _ => "x-exam-authentication"
  }

  def getSession(token: String): Session = {
    sessionCache.getOrElseUpdate[Session](SITNET_CACHE_KEY + token) {
      null
    }
  }

  def forbid() = {
    Results.Unauthorized("Unauthorized")
  }

  def getLoggedUser(token: String): User = getSession(token) match {
    case session: Any =>
      Ebean.find(classOf[User], getSession(token).getUserId)
    case _ => null
  }

  def getAuthorizedUser(token: String, roles: Seq[String]): User = getLoggedUser(token) match {
    case user: Any =>
      getSession(token) match {
        case session: Any => roles.contains(session.getLoginRole) match {
          case true => user
          case _ => null
        }
        case _ => null
      }
    case _ => null
  }

}
