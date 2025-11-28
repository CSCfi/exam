// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors.scala

import miscellaneous.json.JsonFilter
import org.apache.pekko.stream.Materializer
import org.apache.pekko.util.ByteString
import play.api.http.HttpEntity
import play.api.libs.json.Json
import play.api.libs.typedmap.TypedKey
import play.api.mvc.*

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class AnonymousJsonFilter @Inject() (implicit materializer: Materializer, ec: ExecutionContext) {

  import AnonymousJsonFilter.*

  def apply(
      filteredProperties: Set[String],
      contextParamKey: String = DEFAULT_CONTEXT_KEY
  ): ActionFunction[Request, Request] =
    new ActionFunction[Request, Request] {
      override def executionContext: ExecutionContext = ec

      override def invokeBlock[A](request: Request[A], block: Request[A] => Future[Result]): Future[Result] =
        block(request).flatMap { result =>
          if result.header.headers.contains(ANONYMOUS_HEADER) then
            // Read IDs from result attributes (stored by writeAnonymousResult)
            val ids = result.attrs.get(TypedKey[Set[Long]](contextParamKey)).getOrElse(Set.empty)
            filterJsonResponse(result, ids, filteredProperties)
          else Future.successful(result)
        }
    }

  private def filterJsonResponse(result: Result, ids: Set[Long], properties: Set[String]): Future[Result] =
    val contentType = result.body.contentType.getOrElse("")
    if !contentType.equalsIgnoreCase("application/json") || properties.isEmpty then Future.successful(result)
    result.body match
      case HttpEntity.Strict(data, _) => filterStrictBody(result, data, ids, properties)
      case _                          =>
        // For streamed or chunked bodies, consume the stream first
        result.body.consumeData.flatMap(filterStrictBody(result, _, ids, properties))

  private def filterStrictBody(
      result: Result,
      data: ByteString,
      ids: Set[Long],
      properties: Set[String]
  ): Future[Result] =
    Future {
      val json     = Json.parse(data.utf8String)
      val filtered = JsonFilter.filter(json, ids, properties)

      result.copy(
        body = HttpEntity.Strict(ByteString(Json.stringify(filtered)), Some("application/json"))
      )
    }
}

object AnonymousJsonFilter:
  val ANONYMOUS_HEADER    = "Anonymous"
  val DEFAULT_CONTEXT_KEY = "ids"
