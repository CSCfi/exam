// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import org.jsoup.Jsoup
import play.api.libs.json.*

import scala.reflect.ClassTag
import scala.util.Try

/** Scala-idiomatic helper for parsing and sanitizing JSON fields using Play JSON.
  *
  * Provides type-safe parsing with Option return types and HTML sanitization. This is a legacy helper that maintains
  * compatibility with existing code. New code should prefer using PlayJsonHelper directly.
  */
object SanitizingHelper:

  // Parse a field from JsValue with type safety.
  def parse[T: ClassTag](fieldName: String, json: JsValue): Option[T] =
    (json \ fieldName).asOpt[JsValue].flatMap(parseValue[T])

  // Parse a field with a default value.
  def parseOrElse[T: ClassTag](fieldName: String, json: JsValue, default: T): T =
    parse[T](fieldName, json).getOrElse(default)

  // Parse an enum field.
  def parseEnum[E <: Enum[E]](fieldName: String, json: JsValue, enumClass: Class[E]): Option[E] =
    (json \ fieldName)
      .asOpt[String]
      .flatMap(str => Try(Enum.valueOf(enumClass, str)).toOption)

  def parseArray[T: ClassTag](fieldName: String, json: JsValue): Option[List[T]] =
    (json \ fieldName)
      .asOpt[JsArray]
      .map { arrayNode =>
        arrayNode.value.toList.flatMap(parseValue[T])
      }

  // Parse and sanitize HTML from a field.
  def parseHtml(fieldName: String, json: JsValue): Option[String] =
    (json \ fieldName)
      .asOpt[String]
      .flatMap(sanitizeHtml)

  // Sanitize HTML string.
  private def sanitizeHtml(html: String): Option[String] =
    Option(html).map(text => Jsoup.clean(text, HtmlSafelist.SAFELIST))

  // Parse a value from a JsValue field.
  private def parseValue[T: ClassTag](field: JsValue): Option[T] =
    val clazz = implicitly[ClassTag[T]].runtimeClass

    val value: Any = clazz match
      case c if c == classOf[String] =>
        field.asOpt[String].orNull
      case c if c == classOf[Long] =>
        field.asOpt[Long].orNull
      case c if c == classOf[Int] =>
        field.asOpt[Int].orNull
      case c if c == classOf[Double] =>
        field.asOpt[Double].orNull
      case c if c == classOf[Boolean] =>
        field.asOpt[Boolean].orNull
      case c if field.isInstanceOf[JsObject] =>
        Json.stringify(field)
      case _ =>
        null

    Option(value).map(_.asInstanceOf[T])
