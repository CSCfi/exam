// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import org.apache.pekko.stream.Materializer
import play.api.Logging
import play.api.mvc.{Filter, RequestHeader, Result}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

// This is a top-level filter that only has access to request headers - not bodies.
// For that there's the AuditedAction composite (scala) and SystemRequestHandler (java)
class AuditLogFilter @Inject() (implicit val mat: Materializer, ec: ExecutionContext) extends Filter
    with Logging:
  override def apply(next: RequestHeader => Future[Result])(rh: RequestHeader): Future[Result] =
    val (method, session, uri) = (rh.method, rh.session, rh.uri)
    // No point in logging asset requests. Also, requests with bodies are handled down the line
    if Seq("app/", "integration/").exists(uri.tail.startsWith) && !rh.hasBody then
      val userString =
        if session.isEmpty || session.get("id").isEmpty then "user <NULL>"
        else
          val (id, email) = (session.get("id").get, session.get("email").getOrElse(""))
          s"user #$id [$email]"
      logger.debug(s"$userString $method $uri")
    next(rh)
