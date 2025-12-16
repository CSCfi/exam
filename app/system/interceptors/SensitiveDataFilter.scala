// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors

import org.apache.pekko.stream.Materializer
import org.apache.pekko.util.ByteString
import play.api.http.HttpEntity
import play.api.libs.json.Json
import play.api.mvc._
import services.json.JsonFilter

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

/** Filter to remove sensitive fields from JSON responses
  */
class SensitiveDataFilter @Inject() (implicit materializer: Materializer, ec: ExecutionContext):

  def apply(sensitiveFields: Set[String]): ActionFunction[Request, Request] =
    new ActionFunction[Request, Request]:
      override def executionContext: ExecutionContext = ec

      override def invokeBlock[A](request: Request[A], block: Request[A] => Future[Result]): Future[Result] =
        block(request).flatMap { result =>
          filterJsonResponse(result, sensitiveFields)
        }

  private def filterJsonResponse(result: Result, sensitiveFields: Set[String]): Future[Result] =
    val contentType = result.body.contentType.getOrElse("")

    // Only filter JSON responses with non-empty field list
    if !contentType.equalsIgnoreCase("application/json") || sensitiveFields.isEmpty then
      return Future.successful(result)

    result.body match
      case HttpEntity.Strict(data, _) =>
        filterStrictBody(result, data, sensitiveFields)
      case _ =>
        // For streamed or chunked bodies, consume the stream first
        result.body.consumeData.flatMap { data =>
          filterStrictBody(result, data, sensitiveFields)
        }

  private def filterStrictBody(
      result: Result,
      data: ByteString,
      sensitiveFields: Set[String]
  ): Future[Result] =
    Future {
      val json = Json.parse(data.utf8String)
      // Use JsonFilter with empty ID set to filter all occurrences of sensitive fields
      val filtered = JsonFilter.filter(json, Set.empty[Long], sensitiveFields)

      Result(
        header = result.header,
        body = HttpEntity.Strict(ByteString(Json.stringify(filtered)), Some("application/json"))
      )
    }
