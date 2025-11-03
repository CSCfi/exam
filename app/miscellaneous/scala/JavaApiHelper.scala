// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.{DB, Model}
import play.api.libs.json.{JsValue, Json}

import scala.jdk.CollectionConverters.*

trait JavaApiHelper:

  extension [T <: Model](model: T)
    def asJson: JsValue = 
      // Use Ebean's JSON service which has proper circular reference handling + Joda support
      Json.parse(DB.json().toJson(model))

  extension [T <: Model](model: Iterable[T])
    def asJson: JsValue = 
      // Use Ebean's JSON service which has proper circular reference handling + Joda support
      Json.parse(DB.json().toJson(model.toSeq.asJava))
