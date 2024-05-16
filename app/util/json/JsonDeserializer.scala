/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
