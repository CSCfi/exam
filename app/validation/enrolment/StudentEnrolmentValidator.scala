// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.enrolment

import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results}
import validation.core.{PlayJsonValidator, ScalaAttrs}

import scala.util.matching.Regex

/** Validates student enrolment data including email and user ID */
object StudentEnrolmentValidator extends PlayJsonValidator:

  private val emailRegex: Regex = """^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$""".r

  override def sanitize(
      request: Request[play.api.mvc.AnyContent],
      json: JsValue
  ): Either[Result, Request[play.api.mvc.AnyContent]] =
    // Extract and validate optional user ID
    val withUserId = (json \ "uid").asOpt[Long] match
      case Some(userId) => request.addAttr(ScalaAttrs.USER_ID, userId)
      case None         => request

    // Extract and validate optional email
    (json \ "email").asOpt[String] match
      case Some(email) if email.trim.nonEmpty =>
        emailRegex.findFirstIn(email) match
          case Some(_) => Right(withUserId.addAttr(ScalaAttrs.EMAIL, email))
          case None    => Left(Results.BadRequest("bad email format"))
      case Some(_) => Right(withUserId) // Empty email is allowed
      case None    => Right(withUserId) // No email is allowed
