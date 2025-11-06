// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala

import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results}
import validation.scala.core.{PlayJsonValidator, ScalaAttrs}

/** Validates and extracts course code from enrolment request */
object EnrolmentCourseInformationValidator extends PlayJsonValidator:

  override def sanitize(
      request: Request[play.api.mvc.AnyContent],
      json: JsValue
  ): Either[Result, Request[play.api.mvc.AnyContent]] =
    (json \ "code").asOpt[String] match
      case Some(code) => Right(request.addAttr(ScalaAttrs.COURSE_CODE, code))
      case None       => Left(Results.BadRequest("Missing course code"))
