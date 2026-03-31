// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.json

import com.fasterxml.jackson.databind.JsonNode
import com.google.gson.GsonBuilder
import com.google.gson.JsonDeserializationContext
import com.google.gson.JsonDeserializer
import com.google.gson.JsonElement
import com.google.gson.JsonPrimitive
import com.google.gson.JsonSerializationContext
import com.google.gson.JsonSerializer
import play.api.Logging

import java.lang.reflect.Type
import java.text.SimpleDateFormat
import java.time.format.DateTimeFormatter
import java.time.{Instant, LocalTime}
import java.util.Date
import scala.util.{Success, Try}

object JsonDeserializer:
  private val builder = new GsonBuilder()
  builder.registerTypeAdapter(classOf[Date], new DateDeserializer())
  builder.registerTypeAdapter(classOf[Instant], new InstantTypeAdapter())
  builder.registerTypeAdapter(classOf[LocalTime], new LocalTimeTypeAdapter())
  private val gson = builder.create()

  def deserialize[T](model: Class[T], node: JsonNode): T = gson.fromJson(node.toString, model)

class DateDeserializer extends JsonDeserializer[Date] with Logging:
  override def deserialize(
      json: JsonElement,
      typeOfT: Type,
      context: JsonDeserializationContext
  ): Date =
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

class InstantTypeAdapter extends JsonSerializer[Instant] with JsonDeserializer[Instant]
    with Logging:
  override def serialize(
      src: Instant,
      typeOfSrc: Type,
      context: JsonSerializationContext
  ): JsonElement =
    new JsonPrimitive(DateTimeFormatter.ISO_INSTANT.format(src))

  override def deserialize(
      json: JsonElement,
      typeOfT: Type,
      context: JsonDeserializationContext
  ): Instant =
    Try(Instant.parse(json.getAsString)) match
      case Success(i) => i
      case _ =>
        Try(Instant.ofEpochMilli(json.getAsLong)) match
          case Success(i) => i
          case _ =>
            logger.warn(s"Failed to parse instant ${json.getAsString}")
            null

class LocalTimeTypeAdapter extends JsonSerializer[LocalTime] with JsonDeserializer[LocalTime]
    with Logging:
  override def serialize(
      src: LocalTime,
      typeOfSrc: Type,
      context: JsonSerializationContext
  ): JsonElement =
    new JsonPrimitive(src.format(DateTimeFormatter.ISO_LOCAL_TIME))

  override def deserialize(
      json: JsonElement,
      typeOfT: Type,
      context: JsonDeserializationContext
  ): LocalTime =
    Try(LocalTime.parse(json.getAsString, DateTimeFormatter.ISO_LOCAL_TIME)) match
      case Success(t) => t
      case _ =>
        logger.warn(s"Failed to parse local time ${json.getAsString}")
        null
