/*
 *
 *  * Copyright (c) 2024 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *  *
 *  * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 *  * versions of the EUPL (the "Licence");
 *  * You may not use this work except in compliance with the Licence.
 *  * You may obtain a copy of the Licence at:
 *  *
 *  * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *  *
 *  * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 *  * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  * See the Licence for the specific language governing permissions and limitations under the Licence.
 *
 */

package system

import play.api.Logging
import play.api.mvc._

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class AuditedAction @Inject() (parser: BodyParsers.Default)(implicit ec: ExecutionContext)
    extends ActionBuilderImpl(parser)
    with Logging:
  override def invokeBlock[A](request: Request[A], block: Request[A] => Future[Result]): Future[Result] =
    log(request)
    block(request)

  private def log[A](request: Request[A]): Unit =
    val (method, session, uri) = (request.method, request.session, request.uri)
    val userString =
      if session.isEmpty || session.get("id").isEmpty then "user <NULL>"
      else
        val (id, email) = (session.get("id").get, session.get("email").getOrElse(""))
        s"user #$id [$email]"
    val logEntry = s"$userString $method $uri"
    // Do not log body of data import request to avoid logs getting unreadable.
    if method == "POST" || method == "PUT" && request.path != "/integration/iop/import" then
      val json = if !request.hasBody then None else request.body.asInstanceOf[AnyContent].asJson
      logger.debug(s"$logEntry data: ${json.getOrElse("")}")
    else logger.debug(logEntry)
