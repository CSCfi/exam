// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.other

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.SanitizingException
import validation.core.*

import scala.jdk.CollectionConverters.*

class CommaJoinedListValidator extends ValidatorAction:

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request =
    SanitizingHelper.parseCommaSeparated[java.lang.Long]("ids", body) match
      case Some(ids) if ids.nonEmpty => req.addAttr(Attrs.ID_COLLECTION, ids.asJava)
      case Some(_)                   => throw SanitizingException("empty list")
      case None                      => throw SanitizingException("bad list")
