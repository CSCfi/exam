/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

import exceptions.MalformedDataException
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
    logger.error(s"onServerError: ${request.method}, ${request.uri}", exception)
    val cause        = exception.getCause
    val errorMessage = if cause == null then exception.getMessage else cause.getMessage
    val result = Failure(cause) match
      case Failure(e: MalformedDataException)   => Results.BadRequest(errorMessage)
      case Failure(e: IllegalArgumentException) => Results.BadRequest(errorMessage)
      case Failure(e: OptimisticLockException)  => Results.BadRequest("i18n_error_data_has_changed")
      case _                                    => Results.InternalServerError(errorMessage)
    Future.successful(result)
