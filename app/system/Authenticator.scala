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

package system

import com.typesafe.config.ConfigFactory
import io.ebean.Ebean
import models.{Session, User}
import play.api.cache.SyncCacheApi
import play.api.mvc.{Result, Results}


trait Authenticator {

  val LOGIN_TYPE: String = ConfigFactory.load.getString("sitnet.login")

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

  def forbid(): Result = {
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
