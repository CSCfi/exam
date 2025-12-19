// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation

import play.api.libs.json._
import play.api.mvc._
import validation.core._

object CommaJoinedListValidator extends PlayJsonValidator:

  override def sanitize(
      request: Request[AnyContent],
      json: JsValue
  ): Either[Result, Request[AnyContent]] =
    // Alternative path for file download requests that have params field
    val root: JsValue = (json \ "params" \ "ids").toOption match
      case Some(_) => (json \ "params").as[JsValue]
      case None    => json

    // Try parsing as Long IDs first
    PlayJsonHelper.parseCommaSeparatedLongs("ids", root) match
      case Some(ids) if ids.nonEmpty =>
        Right(request.addAttr(ScalaAttrs.ID_LIST, ids))
      case Some(_) =>
        Left(Results.BadRequest("empty list"))
      case None =>
        // If Long parsing failed, try parsing as Strings
        PlayJsonHelper.parseCommaSeparatedStrings("ids", root) match
          case Some(stringIds) if stringIds.nonEmpty =>
            Right(request.addAttr(ScalaAttrs.STRING_LIST, stringIds))
          case Some(_) =>
            Left(Results.BadRequest("empty list"))
          case None =>
            Left(Results.BadRequest("no ids found"))
