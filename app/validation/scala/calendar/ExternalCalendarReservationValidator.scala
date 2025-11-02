// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.calendar

import com.fasterxml.jackson.databind.JsonNode
import play.api.libs.json.Json
import play.mvc.Http
import validation.java.core.{Attrs, ValidatorAction}

class ExternalCalendarReservationValidator extends ValidatorAction:

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    val jsValue = Json.parse(body.toString)
    ReservationValidator.forCreationExternal(jsValue) match
      case Right(reservation) => req.addAttr(Attrs.EXT_STUDENT_RESERVATION, reservation)
      case Left(ex)           => throw ex
