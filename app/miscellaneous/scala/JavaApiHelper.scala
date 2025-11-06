// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.{DB, Model}
import io.ebean.text.PathProperties
import play.api.libs.json.{JsValue, Json}

import scala.jdk.CollectionConverters.*

trait JavaApiHelper:

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
