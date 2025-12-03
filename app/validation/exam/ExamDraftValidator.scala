// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.exam

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.core.{Attrs, ValidatorAction}

class ExamDraftValidator extends ValidatorAction:
  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    ExamValidator.forCreation(body) match
      case Right(exam) => req.addAttr(Attrs.EXAM, exam)
      case Left(ex)    => throw ex
