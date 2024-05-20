// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package util.scala

import io.ebean.Model
import play.api.mvc.Result
import play.api.mvc.Results.Status
import play.libs.{Json => JavaJson}

trait JavaApiHelper:

  extension [T <: Model](model: T) def toResult(status: Status): Result = status(JavaJson.toJson(model).toString)

  extension [T <: Model](model: Iterable[T])
    def toResult(status: Status): Result = status(JavaJson.toJson(model).toString)
