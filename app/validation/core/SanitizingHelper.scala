// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import com.fasterxml.jackson.databind.JsonNode
import org.jsoup.Jsoup
import org.jsoup.safety.Safelist

import scala.jdk.CollectionConverters.*
import scala.reflect.ClassTag
import scala.util.Try

/** Scala-idiomatic helper for parsing and sanitizing JSON fields.
  *
  * Provides type-safe parsing with Option return types and HTML sanitization.
  */
object SanitizingHelper:

  private val safelist: Safelist = Safelist
    .relaxed()
    .addAttributes("a", "target")
    .addAttributes("span", "class", "id", "style", "case-sensitive", "cloze", "numeric", "precision")
    .addAttributes("table", "cellspacing", "cellpadding", "border", "style", "caption")

  // Parse a field from JsonNode with type safety.
  def parse[T: ClassTag](fieldName: String, node: JsonNode): Option[T] =
    Option(node.get(fieldName))
      .filterNot(_.isNull)
      .flatMap(parseValue[T])

  // Parse a field with a default value.
  def parseOrElse[T: ClassTag](fieldName: String, node: JsonNode, default: T): T =
    parse[T](fieldName, node).getOrElse(default)

  // Parse an enum field.
  def parseEnum[E <: Enum[E]](fieldName: String, node: JsonNode, enumClass: Class[E]): Option[E] =
    Option(node.get(fieldName))
      .filter(_.isTextual)
      .flatMap(field => Try(Enum.valueOf(enumClass, field.asText())).toOption)

  def parseArray[T: ClassTag](fieldName: String, node: JsonNode): Option[List[T]] =
    Option(node.get(fieldName))
      .filter(_.isArray)
      .map { arrayNode =>
        arrayNode.elements().asScala.toList.flatMap(parseValue[T])
      }

  def parseCommaSeparated[T: ClassTag](
      fieldName: String,
      node: JsonNode,
      separator: String = ","
  ): Option[List[T]] =
    val clazz = implicitly[ClassTag[T]].runtimeClass
    parse[String](fieldName, node)
      .filter(_.trim.nonEmpty)
      .map { str =>
        str.split(separator).toList.flatMap { element =>
          val trimmed = element.trim
          // Parse based on type
          Try {
            clazz match
              case c if c == classOf[java.lang.Long] =>
                java.lang.Long.valueOf(trimmed).asInstanceOf[T]
              case c if c == classOf[java.lang.Integer] =>
                java.lang.Integer.valueOf(trimmed).asInstanceOf[T]
              case c if c == classOf[java.lang.Double] =>
                java.lang.Double.valueOf(trimmed).asInstanceOf[T]
              case c if c == classOf[String] =>
                trimmed.asInstanceOf[T]
              case _ =>
                throw new IllegalArgumentException(s"Unsupported type for comma-separated parsing: ${clazz.getName}")
          }.toOption
        }
      }

  // Parse and sanitize HTML from a field.
  def parseHtml(fieldName: String, node: JsonNode): String =
    parse[String](fieldName, node)
      .map(sanitizeHtml)
      .orNull

  // Sanitize HTML string.
  private def sanitizeHtml(html: String): String =
    if html == null then null
    else Jsoup.clean(html, safelist)

// Parse a value from a JsonNode field.
private def parseValue[T: ClassTag](field: JsonNode): Option[T] =
  val clazz = implicitly[ClassTag[T]].runtimeClass

  val value: Any = clazz match
    case c if c == classOf[String] && field.isTextual =>
      field.asText()
    // Support both Scala Long and Java Long
    case c if (c == classOf[Long] || c == classOf[java.lang.Long]) && field.canConvertToLong =>
      Long.box(field.asLong())
    // Support both Scala Int and Java Integer
    case c if (c == classOf[Int] || c == classOf[java.lang.Integer]) && field.canConvertToInt =>
      Int.box(field.asInt())
    // Support both Scala Double and Java Double
    case c if (c == classOf[Double] || c == classOf[java.lang.Double]) && (field.isDouble || field.canConvertToLong) =>
      Double.box(field.asDouble())
    // Support both Scala Boolean and Java Boolean
    case c if (c == classOf[Boolean] || c == classOf[java.lang.Boolean]) && field.isBoolean =>
      Boolean.box(field.asBoolean())
    case c if field.isObject =>
      field.toString
    case _ =>
      null

  Option(value).map(_.asInstanceOf[T])
