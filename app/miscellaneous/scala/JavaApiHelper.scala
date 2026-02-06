// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import com.fasterxml.jackson.databind.ObjectMapper
import io.ebean.Model
import play.api.libs.json.jackson.PlayJsonMapperModule
import play.api.libs.json.{JsValue, JsonConfig}
import play.libs.Json as JavaJson

trait JavaApiHelper:

  private val jsonSettings = JsonConfig.settings
  private val mapper       = new ObjectMapper().registerModule(new PlayJsonMapperModule(jsonSettings))

  extension [T <: Model](model: T)
    def asJson: JsValue = mapper.readValue(JavaJson.toJson(model).toString, classOf[JsValue])

  extension [T <: Model](model: Iterable[T])
    def asJson: JsValue = mapper.readValue(JavaJson.toJson(model).toString, classOf[JsValue])
