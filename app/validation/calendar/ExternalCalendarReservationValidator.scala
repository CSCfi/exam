// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.{Attrs, ValidatorAction}

class ExternalCalendarReservationValidator extends ValidatorAction:

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    ReservationValidator.forCreationExternal(body) match
      case Right(reservation) => req.addAttr(Attrs.EXT_STUDENT_RESERVATION, reservation)
      case Left(ex)           => throw ex
