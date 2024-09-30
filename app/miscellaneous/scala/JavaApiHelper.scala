// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.Model
import play.api.mvc.Result
import play.libs.{Json => JavaJson}

trait JavaApiHelper:

  extension [T <: Model](model: T) def toJson: String = JavaJson.toJson(model).toString

  extension [T <: Model](model: Iterable[T]) def toJson: String = JavaJson.toJson(model).toString

  extension (result: Result) def asJson: Result = result.as("application/json")
