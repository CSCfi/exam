// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import org.apache.pekko.util.ByteString
import play.api.http.HttpEntity
import play.api.libs.json.*
import play.api.mvc.Result

import java.time.Instant
import java.time.format.DateTimeFormatterBuilder
import scala.util.Try

/** Writes every timestamp in IOP JSON with exactly three fractional digits (`…09:00:00.000Z`).
  *
  * EXAM before 7.1 parses timestamps strictly: Joda's ISO parser needs the fraction, and its
  * `java.util.Date` fields need exactly milliseconds. EXAM 7.1 writes instants with a variable
  * fraction (none when the milliseconds are zero, six digits for microseconds), which those
  * versions would read as null or misread. Applied to everything sent to XM ([[IopAwareWSClient]])
  * and to `/integration/iop` responses (`SystemFilter`), so no serializer needs to know about it.
  */
object IopTimestamps:

  private val Timestamp = """\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z""".r
  private val Millis    = new DateTimeFormatterBuilder().appendInstant(3).toFormatter

  def normalise(json: JsValue): JsValue = json match
    case JsString(s) if Timestamp.matches(s) => JsString(Millis.format(Instant.parse(s)))
    case JsObject(fields) => JsObject(fields.toSeq.map((k, v) => k -> normalise(v)))
    case JsArray(items)   => JsArray(items.map(normalise))
    case other            => other

  /** The bytes with normalised timestamps, or None when they are not a JSON object or array */
  def normalise(bytes: ByteString): Option[ByteString] =
    bytes.find(b => !Character.isWhitespace(b)) match
      case Some('{') | Some('[') =>
        Try(Json.parse(bytes.toArrayUnsafe())).toOption
          .map(json => ByteString(Json.stringify(normalise(json))))
      case _ => None

  /** A JSON response with normalised timestamps; anything else unchanged */
  def normalise(result: Result): Result = result.body match
    case HttpEntity.Strict(data, contentType) if contentType.exists(_.contains("json")) =>
      normalise(data).fold(result)(b => result.copy(body = HttpEntity.Strict(b, contentType)))
    case _ => result
