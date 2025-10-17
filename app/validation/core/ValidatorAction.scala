// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import com.fasterxml.jackson.databind.JsonNode
import org.slf4j.{Logger, LoggerFactory}
import play.libs.Json
import play.mvc.{Http, Result, Results}
import validation.SanitizingException

import java.util.concurrent.{CompletableFuture, CompletionStage}
import scala.jdk.CollectionConverters.*

/** Base class for sanitizers that validate and enrich HTTP requests.
  */
abstract class ValidatorAction extends play.mvc.Action.Simple:

  protected def logger: Logger = LoggerFactory.getLogger(getClass)

  override def call(request: Http.Request): CompletionStage[Result] =
    val body = request.body().asJson()
    try
      val sanitized = sanitize(request, body)
      delegate.call(sanitized)
    catch
      case e: ValidationException =>
        logger.warn("Validation error: {}", e.getMessage)
        val errors =
          e.getValidationResult.getErrors.map(e => Json.newObject().put("field", e.field).put("message", e.message))
        val response = Json.newObject().put("status", "validation_error").putArray("errors").addAll(errors.asJava)
        CompletableFuture.completedFuture(Results.badRequest(response))
      case e: SanitizingException => // java side exception
        logger.error("Sanitizing error: {}", e.getMessage, e)
        CompletableFuture.completedFuture(Results.badRequest(e.getMessage))

  @throws[SanitizingException] // for java interop
  def sanitize(req: Http.Request, body: JsonNode): Http.Request
