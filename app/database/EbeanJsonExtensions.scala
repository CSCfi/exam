// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import com.fasterxml.jackson.databind.JsonNode
import io.ebean.text.PathProperties
import io.ebean.{DB, Model}
import org.apache.pekko.stream.scaladsl.Source
import org.apache.pekko.util.ByteString
import play.api.libs.json.{JsValue, Json}

import scala.jdk.CollectionConverters.*

trait EbeanJsonExtensions:

  extension [T <: Model](model: T)
    def asJson: JsValue =
      // Use Ebean's JSON service which has proper circular reference handling + Joda support
      Json.parse(DB.json().toJson(model))
    def asJson(pp: PathProperties): JsValue =
      Json.parse(DB.json().toJson(model, pp))

  extension [T <: Model](model: Iterable[T])
    def asJson: JsValue =
      // Use Ebean's JSON service which has proper circular reference handling + Joda support
      Json.parse(DB.json().toJson(model.toSeq.asJava))
    def asJson(pp: PathProperties): JsValue =
      Json.parse(DB.json().toJson(model.toSeq.asJava, pp))

    // Ebean's JSON as is, for responses that only send it on. Skipping the JsValue round trip
    // matters for large lists, where the parsed tree is several times the size of the text.
    def asJsonText: String                     = DB.json().toJson(model.toSeq.asJava)
    def asJsonText(pp: PathProperties): String = DB.json().toJson(model.toSeq.asJava, pp)

  extension [T <: Model](pages: Source[Seq[T], ?])
    /** One JSON array streamed page by page, so only one page is serialized at a time. */
    def asJsonArray: Source[ByteString, ?] = jsonArray(pages)(page => DB.json().toJson(page))
    def asJsonArray(pp: PathProperties): Source[ByteString, ?] =
      jsonArray(pages)(page => DB.json().toJson(page, pp))

  private def jsonArray[T](pages: Source[Seq[T], ?])(
      toJson: java.util.List[T] => String
  ): Source[ByteString, ?] =
    pages
      .filter(_.nonEmpty)
      .map { page =>
        val json = toJson(page.asJava)
        // Drop the page's own brackets; intersperse adds the enclosing ones
        ByteString(json.substring(1, json.length - 1))
      }
      .intersperse(ByteString("["), ByteString(","), ByteString("]"))

  /** Convert Play JSON (JsValue) to Jackson JSON (JsonNode)
    *
    * Useful for interoperability with Java code that uses Jackson.
    *
    * @param jsValue
    *   the Play JSON value to convert
    * @return
    *   the Jackson JsonNode representation
    */
  def toJacksonJson(jsValue: JsValue): JsonNode =
    play.libs.Json.parse(Json.stringify(jsValue))

  /** Convert Jackson JSON (JsonNode) to Play JSON (JsValue)
    *
    * Useful for interoperability with Java code that uses Jackson.
    *
    * @param node
    *   the Jackson JsonNode to convert
    * @return
    *   the Play JsValue representation
    */
  def toPlayJson(node: JsonNode): JsValue =
    Json.parse(play.libs.Json.stringify(node))

/** Helper object for JSON conversions
  *
  * Provides standalone functions for JSON conversion that don't require mixing in traits.
  */
object EbeanJsonExtensions:
  /** Convert Play JSON (JsValue) to Jackson JSON (JsonNode)
    *
    * Useful for interoperability with Java code that uses Jackson.
    *
    * @param jsValue
    *   the Play JSON value to convert
    * @return
    *   the Jackson JsonNode representation
    */
  def toJacksonJson(jsValue: JsValue): JsonNode =
    play.libs.Json.parse(Json.stringify(jsValue))

  /** Convert Jackson JSON (JsonNode) to Play JSON (JsValue)
    *
    * Useful for interoperability with Java code that uses Jackson.
    *
    * @param node
    *   the Jackson JsonNode to convert
    * @return
    *   the Play JsValue representation
    */
  def toPlayJson(node: JsonNode): JsValue =
    Json.parse(play.libs.Json.stringify(node))
