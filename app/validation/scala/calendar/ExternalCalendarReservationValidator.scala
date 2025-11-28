// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.calendar

import play.api.libs.json.JsValue
import play.api.mvc.{Request, Result, Results, AnyContent}
import validation.scala.core.{PlayJsonValidator, ScalaAttrs}

object ExternalCalendarReservationValidator extends PlayJsonValidator:

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    ReservationValidator.forCreationExternal(json) match
      case Right(reservation) => Right(request.addAttr(ScalaAttrs.ATTR_EXT_RESERVATION, reservation))
      case Left(ex)           => Left(Results.BadRequest(ex.getMessage))
