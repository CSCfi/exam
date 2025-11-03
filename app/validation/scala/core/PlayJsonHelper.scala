// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import play.api.libs.json.*

/** Helper functions for parsing and validating Play JSON values
  */
object PlayJsonHelper:

  /** Parse a field from JsValue with type safety
    */
  def parse[T](fieldName: String, json: JsValue)(using reads: Reads[T]): Option[T] =
    (json \ fieldName).asOpt[T]

  /** Parse a field with a default value
    */
  def parseOrElse[T](fieldName: String, json: JsValue, default: T)(using reads: Reads[T]): T =
    parse[T](fieldName, json).getOrElse(default)

  /** Parse an array field
    */
  def parseArray[T](fieldName: String, json: JsValue)(using reads: Reads[T]): Option[List[T]] =
    (json \ fieldName).asOpt[List[T]]

  /** Parse comma-separated values from a string field
    */
  def parseCommaSeparated[T](fieldName: String, json: JsValue, separator: String = ",", conv: String => Option[T]): Option[List[T]] =
    (json \ fieldName)
      .asOpt[String]
      .filter(_.trim.nonEmpty)
      .map { str =>
        str.split(separator).toList.flatMap(s => conv(s.trim))
      }

  /** Parse comma-separated Longs
    */
  def parseCommaSeparatedLongs(fieldName: String, json: JsValue): Option[List[Long]] =
    parseCommaSeparated[Long](fieldName, json, ",", s => s.toLongOption)

  /** Parse comma-separated Strings (trimmed)
    */
  def parseCommaSeparatedStrings(fieldName: String, json: JsValue): Option[List[String]] =
    parseCommaSeparated[String](fieldName, json, ",", s => if s.nonEmpty then Some(s) else None)

  /** Navigate to nested field using path notation
    */
  def parsePath[T](path: String, json: JsValue)(using reads: Reads[T]): Option[T] =
    val parts = path.split('.')
    val initialResult: JsLookupResult = JsDefined(json)
    val result: JsLookupResult = parts.foldLeft(initialResult) { (acc, key) =>
      acc match
        case JsDefined(value) => value \ key
        case u: JsUndefined   => u
    }
    result.asOpt[T]

  /** Parse and sanitize HTML from a field
    */
  def parseHtml(fieldName: String, json: JsValue): Option[String] =
    import org.jsoup.Jsoup
    import org.jsoup.safety.Safelist
    
    val safelist = Safelist
      .relaxed()
      .addAttributes("a", "target")
      .addAttributes("span", "class", "id", "style", "case-sensitive", "cloze", "numeric", "precision")
      .addAttributes("table", "cellspacing", "cellpadding", "border", "style", "caption")
      .addTags("math-field")
      .addAttributes("math-field", "data-expression", "read-only", "math-virtual-keyboard-policy")
    
    parse[String](fieldName, json).map { html =>
      if html == null then null
      else Jsoup.clean(html, safelist)
    }

  /** Parse a DateTime field using Joda DateTime
    */
  def parseDateTime(fieldName: String, json: JsValue): Option[org.joda.time.DateTime] =
    import org.joda.time.format.ISODateTimeFormat
    parse[String](fieldName, json).flatMap { str =>
      scala.util.Try(org.joda.time.DateTime.parse(str, ISODateTimeFormat.dateTimeParser())).toOption
    }

  /** Parse an array field and convert to Long list
    */
  def parseLongArray(fieldName: String, json: JsValue): Option[List[Long]] =
    parseArray[Long](fieldName, json)

  /** Parse an enum value from a String field
    */
  def parseEnum[T <: Enum[T]](fieldName: String, json: JsValue, enumClass: Class[T]): Option[T] =
    parse[String](fieldName, json).flatMap { str =>
      scala.util.Try(Enum.valueOf(enumClass, str)).toOption
    }

