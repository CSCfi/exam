// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation

import play.api.libs.json.JsValue
import play.api.mvc._
import validation.core.{PlayJsonValidator, ScalaAttrs}

object UserLanguageValidator extends PlayJsonValidator:

  override def sanitize(
      request: Request[AnyContent],
      json: JsValue
  ): Either[Result, Request[AnyContent]] =
    (json \ "lang").asOpt[String] match
      case Some(lang) => Right(request.addAttr(ScalaAttrs.LANG, lang))
      case None       => Left(Results.BadRequest("Missing language code"))
