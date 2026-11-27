// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import jakarta.persistence.OptimisticLockException
import play.api.Logging
import play.api.http.HttpErrorHandler
import play.api.mvc.Results.Status
import play.api.mvc.{RequestHeader, Result, Results}

import javax.inject.Singleton
import scala.concurrent.Future
import scala.util.Failure

@Singleton
class SystemErrorHandler extends HttpErrorHandler with Logging:
  override def onClientError(request: RequestHeader, status: Int, message: String): Future[Result] =
    logger.warn(s"onClientError: ${request.method} ${request.uri}, status: $status, msg: $message")
    Future.successful(Status(status))

  override def onServerError(request: RequestHeader, exception: Throwable): Future[Result] =
    logger.error(s"onServerError: ${request.method} ${request.uri}", exception)
    val cause        = exception.getCause
    val errorMessage = Option(cause).map(_.getMessage).getOrElse(exception.getMessage)
    val result = Failure(cause) match
      case Failure(e: IllegalArgumentException) => Results.BadRequest(errorMessage)
      case Failure(e: OptimisticLockException)  => Results.BadRequest("i18n_error_data_has_changed")
      case _                                    => Results.InternalServerError(errorMessage)
    Future.successful(result)
