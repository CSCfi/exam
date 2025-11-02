// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.exam

import com.fasterxml.jackson.databind.JsonNode
import play.api.libs.json.Json
import play.mvc.Http
import validation.java.core.{Attrs, ValidatorAction}

class ExamUpdateValidator extends ValidatorAction:
  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    val jsValue = Json.parse(body.toString)
    ExamValidator.forUpdate(jsValue) match
      case Right(exam) => req.addAttr(Attrs.EXAM, exam)
      case Left(ex)    => throw ex
