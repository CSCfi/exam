// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.exam

import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results, AnyContent}
import validation.scala.core.*

object ExamUpdateValidator extends PlayJsonValidator:

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    ExamValidator.forUpdate(json) match
      case Right(exam) => Right(request.addAttr(ScalaAttrs.EXAM, exam))
      case Left(ex)    => Left(Results.BadRequest(ex.getMessage))
