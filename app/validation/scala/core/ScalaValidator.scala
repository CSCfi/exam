// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import org.slf4j.{Logger, LoggerFactory}
import play.api.libs.json.JsValue
import play.api.mvc.*
import validation.scala.core.SanitizingException

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

  /** Create an ActionFilter that applies this validator
    */
  def filter(implicit ec: ExecutionContext): ActionFilter[Request] = new ActionFilter[Request] {
    override def executionContext: ExecutionContext = ec

    override def filter[A](input: Request[A]): Future[Option[Result]] = Future.successful {
      validate(input.asInstanceOf[Request[AnyContent]]) match
        case Left(errorResult) => Some(errorResult)
        case Right(_)          => None
    }
  }
