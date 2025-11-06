// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.enrolment

import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results}
import validation.scala.core.{PlayJsonValidator, ScalaAttrs}

/** Validates and extracts enrolment information from request */
object EnrolmentInformationValidator extends PlayJsonValidator:

  override def sanitize(
      request: Request[play.api.mvc.AnyContent],
      json: JsValue
  ): Either[Result, Request[play.api.mvc.AnyContent]] =
    (json \ "information").asOpt[String] match
      case Some(info) => Right(request.addAttr(ScalaAttrs.ENROLMENT_INFORMATION, info))
      case None       => Left(Results.BadRequest("Missing enrolment information"))
