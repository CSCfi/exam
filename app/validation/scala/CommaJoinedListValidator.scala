// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala

import com.fasterxml.jackson.databind.JsonNode
import play.mvc.Http
import validation.scala.core.*
import validation.java.core.{Attrs, ValidatorAction}

import scala.jdk.CollectionConverters.*

class CommaJoinedListValidator extends ValidatorAction:

  override def sanitize(req: Http.Request, body: JsonNode): Http.Request = {
    // Alternative path for file download requests that have params field
    val root = if body.path("params.ids").isArray then body.get("params") else body
    SanitizingHelper.parseCommaSeparated[java.lang.Long]("ids", root) match
      case Some(ids) if ids.nonEmpty => req.addAttr(Attrs.ID_COLLECTION, ids.asJava)
      case Some(_)                   => throw SanitizingException("empty list")
      case None                      => throw SanitizingException("bad list")
  }
