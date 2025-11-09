// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors.scala

import play.api.mvc.*
import play.api.mvc.Results.*

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

/** Action filter that routes external students to IOP endpoints
  *
  * If a session contains "visitingStudent" key, the request is redirected from /app/ to /app/iop/ endpoints for
  * external exam execution.
  */
class ExamActionRouter @Inject() (implicit ec: ExecutionContext) extends ActionFilter[Request]:

  override def executionContext: ExecutionContext = ec

  override def filter[A](request: Request[A]): Future[Option[Result]] =
    Future.successful {
      request.session.get("visitingStudent") match
        case Some(_) =>
          val newPath = request.path.replace("/app/", "/app/iop/")
          Some(Redirect(newPath))
        case None => None
    }
