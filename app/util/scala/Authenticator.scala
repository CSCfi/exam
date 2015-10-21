package util.scala

import com.avaje.ebean.Ebean
import models.{Session, User}
import play.api.cache.CacheApi


trait Authenticator {

  val SITNET_TOKEN_HEADER_KEY = "x-exam-authentication"
  val SITNET_CACHE_KEY = "user.session."

  val sessionCache: CacheApi

  def getSession(token: String) = {
    sessionCache.getOrElse[Session](SITNET_CACHE_KEY + token) {
      null
    }
  }

  def getLoggedUser(token: String) = {
    Ebean.find(classOf[User], getSession(token).getUserId)
  }

  def getAuthorizedUser(token: String, roles: Seq[String]) = {
    getLoggedUser(token) match {
      case user: Any =>
        val loginRole = getSession(token).getLoginRole
        roles.contains(loginRole) match {
          case true => user
          case _ => null
        }
      case _ => null
    }
  }

}
