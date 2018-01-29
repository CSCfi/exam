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
import play.api.mvc.{AnyContent, Request, Result, Results}


trait Authenticator {

  def LOGIN_TYPE: String = ConfigFactory.load.getString("sitnet.login")

  def SESSION_CACHE_KEY = "user.session."

  def sessionCache: SyncCacheApi

  def authHeaderName: String = LOGIN_TYPE match {
    case "HAKA" => "Shib-Session-Id"
    case _ => "x-exam-authentication"
  }

  def getSession(token: String): Option[Session] = sessionCache.get[Session](SESSION_CACHE_KEY + token)

  def forbid(): Result = Results.Unauthorized("Unauthorized")

  def getLoggedUser(request: Request[AnyContent]): Option[(Session, User)] =
    request.headers.get(authHeaderName)
      .flatMap(token => getSession(token).map(s => (s, Ebean.find(classOf[User], s.getUserId))))

  def getAuthorizedUser(request: Request[AnyContent], roles: Seq[String]): Option[(Session, User)] =
    getLoggedUser(request) match {
      case Some(x) if roles.isEmpty || roles.contains(x._1.getLoginRole) => Some(x)
      case _ => None
    }

}
