// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala

import org.joda.time.LocalDate
import org.joda.time.format.DateTimeFormat
import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results}
import validation.scala.core.{PlayJsonValidator, ScalaAttrs, SanitizingException}

/** Validates and extracts examination date from request */
class ExaminationDateValidator extends PlayJsonValidator:

  override def sanitize(request: Request[play.api.mvc.AnyContent], json: JsValue): Either[Result, Request[play.api.mvc.AnyContent]] =
    (json \ "date").asOpt[String] match
      case Some(dateStr) =>
        try
          val date = LocalDate.parse(dateStr, DateTimeFormat.forPattern("dd/MM/yy"))
          Right(request.addAttr(ScalaAttrs.DATE, date))
        catch
          case _: IllegalArgumentException =>
            Left(Results.BadRequest("Invalid date format. Expected dd/MM/yy"))
      case None =>
        Left(Results.BadRequest("no date"))

