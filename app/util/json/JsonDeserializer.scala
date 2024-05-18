// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.json

import com.fasterxml.jackson.databind.JsonNode
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging

import java.lang.reflect.Type
import java.text.SimpleDateFormat
import java.util.Date
import scala.util.{Success, Try}

object JsonDeserializer:
  private val builder = new GsonBuilder()
  builder.registerTypeAdapter(classOf[Date], new DateDeserializer())
  builder.registerTypeAdapter(classOf[DateTime], new DateTimeDeserializer())
  private val gson = builder.create()

  def deserialize[T](model: Class[T], node: JsonNode): T = gson.fromJson(node.toString, model)

class DateDeserializer extends JsonDeserializer[Date] with Logging:
  override def deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): Date =
    Try(new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'").parse(json.getAsString)) match
      case Success(d) => d
      case _ =>
        Try(new Date(json.getAsLong)) match
          case Success(dt) => dt
          case _ =>
            Try(new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSSXXX").parse(json.getAsString)) match
              case Success(dt) => dt
              case _ =>
                logger.warn(s"Failed to parse date ${json.getAsString}")
                null

class DateTimeDeserializer extends JsonDeserializer[DateTime] with Logging:
  override def deserialize(json: JsonElement, typeOfT: Type, context: JsonDeserializationContext): DateTime =
    Try(ISODateTimeFormat.dateTime().parseDateTime(json.getAsString)) match
      case Success(dt) => dt
      case _ =>
        Try(new DateTime(json.getAsLong)) match
          case Success(dt) => dt
          case _ =>
            logger.warn(s"Failed to parse datetime ${json.getAsString}")
            null
