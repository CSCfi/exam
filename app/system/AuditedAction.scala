// Copyright (c) 2024 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

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
