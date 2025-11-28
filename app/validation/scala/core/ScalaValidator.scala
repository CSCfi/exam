// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import org.jsoup.safety.Safelist
import org.slf4j.{Logger, LoggerFactory}
import play.api.libs.json.JsValue
import play.api.mvc.*

import scala.concurrent.{ExecutionContext, Future}

/** Base trait for Scala validators that can be used with ActionFilter
  */
trait ScalaValidator[A]:
  protected def logger: Logger = LoggerFactory.getLogger(getClass)

  /** Validate and sanitize the request. Returns either an error Result or a modified Request.
    *
    * @param request
    *   the incoming request
    * @return
    *   Left with error Result, or Right with sanitized Request
    */
  def validate(request: Request[A]): Either[Result, Request[A]]

  /** Create an ActionFilter that applies this validator
    */
  def filter(implicit ec: ExecutionContext): ActionFilter[Request] = new ActionFilter[Request] {
    override def executionContext: ExecutionContext = ec

    override def filter[B](input: Request[B]): Future[Option[Result]] = Future.successful {
      validate(input.asInstanceOf[Request[A]]) match
        case Left(errorResult) => Some(errorResult)
        case Right(_)          => None
    }
  }

  /** Create an ActionRefiner that applies this validator and enriches the request
    */
  def refine(implicit ec: ExecutionContext): ActionRefiner[Request, Request] =
    new ActionRefiner[Request, Request] {
      override def executionContext: ExecutionContext = ec

      override def refine[B](input: Request[B]): Future[Either[Result, Request[B]]] = Future.successful {
        validate(input.asInstanceOf[Request[A]]) match
          case Left(errorResult)      => Left(errorResult)
          case Right(enrichedRequest) => Right(enrichedRequest.asInstanceOf[Request[B]])
      }
    }

/** Play JSON validator (recommended for Scala code)
  *
  * Uses Play's native Scala JSON library - more idiomatic and avoids Jackson conversion.
  */
trait PlayJsonValidator:
  protected def logger: Logger = LoggerFactory.getLogger(getClass)

  /** Common HTML safelist for sanitizing user input
    *
    * Allows common HTML elements and attributes needed for rich text editing, including math-related attributes and
    * math-field tags.
    */
  protected val HTML_SAFELIST: Safelist = HtmlSafelist.SAFELIST

  /** Sanitize the JSON body and enrich the request
    */
  def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]]

  /** Validate the request
    */
  def validate(request: Request[AnyContent]): Either[Result, Request[AnyContent]] =
    request.body.asJson match
      case Some(json) =>
        try sanitize(request, json)
        catch
          case e: SanitizingException =>
            logger.error("Sanitizing error: {}", e.getMessage, e)
            Left(Results.BadRequest(e.getMessage))
          case e: Exception =>
            logger.error("Validation error: {}", e.getMessage, e)
            Left(Results.BadRequest(s"Validation failed: ${e.getMessage}"))
      case None =>
        Left(Results.BadRequest("JSON body required"))

  /** Validate a request with JsValue body (for use with parse.json)
    */
  def validateJsValue(request: Request[JsValue]): Either[Result, Request[JsValue]] =
    try
      // Create a temporary AnyContent request for sanitize
      val tempRequest = request.asInstanceOf[Request[AnyContent]]
      sanitize(tempRequest, request.body) match
        case Left(error)     => Left(error)
        case Right(enriched) =>
          // Cast back to Request[JsValue] - the body type is just a type parameter
          // and the actual body (JsValue) is preserved, only attributes are added
          Right(enriched.asInstanceOf[Request[JsValue]])
    catch
      case e: SanitizingException =>
        logger.error("Sanitizing error: {}", e.getMessage, e)
        Left(Results.BadRequest(e.getMessage))
      case e: Exception =>
        logger.error("Validation error: {}", e.getMessage, e)
        Left(Results.BadRequest(s"Validation failed: ${e.getMessage}"))

  /** Create an ActionRefiner that applies this validator and enriches the request
    */
  def filter(implicit ec: ExecutionContext): ActionRefiner[Request, Request] = new ActionRefiner[Request, Request] {
    override def executionContext: ExecutionContext = ec

    override def refine[A](input: Request[A]): Future[Either[Result, Request[A]]] = Future.successful {
      input match
        case jsRequest: Request[JsValue @unchecked] if input.body.isInstanceOf[JsValue] =>
          validateJsValue(jsRequest) match
            case Left(errorResult)      => Left(errorResult)
            case Right(enrichedRequest) => Right(enrichedRequest.asInstanceOf[Request[A]])
        case _ =>
          validate(input.asInstanceOf[Request[AnyContent]]) match
            case Left(errorResult)      => Left(errorResult)
            case Right(enrichedRequest) => Right(enrichedRequest.asInstanceOf[Request[A]])
    }
  }
