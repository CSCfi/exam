// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.{Attrs, ValidatorAction}

class ReservationCreationValidator extends ValidatorAction:
  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    ReservationValidator.forCreation(body) match
      case Right(reservation) => req.addAttr(Attrs.STUDENT_RESERVATION, reservation)
      case Left(ex)           => throw ex
