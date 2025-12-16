// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import play.api.libs.json.JsValue
import play.api.mvc._
import validation.core.{PlayJsonValidator, ScalaAttrs}

object ReservationCreationValidator extends PlayJsonValidator:

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    ReservationValidator.forCreation(json) match
      case Right(reservation) => Right(request.addAttr(ScalaAttrs.ATTR_STUDENT_RESERVATION, reservation))
      case Left(ex)           => Left(Results.BadRequest(ex.getMessage))
