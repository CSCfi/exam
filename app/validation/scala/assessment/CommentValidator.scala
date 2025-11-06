// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.assessment

import play.api.libs.json.*
import play.api.mvc.*
import validation.scala.core.*

object CommentValidator extends PlayJsonValidator:

  override def sanitize(request: Request[AnyContent], json: JsValue): Either[Result, Request[AnyContent]] =
    val comment        = PlayJsonHelper.parseHtml("comment", json)
    val commentId      = PlayJsonHelper.parse[Long]("id", json)
    val feedbackStatus = PlayJsonHelper.parse[Boolean]("feedbackStatus", json)

    val updatedRequest = Seq(
      comment.map(c => (req: Request[AnyContent]) => req.addAttr(ScalaAttrs.COMMENT, c)),
      commentId.map(id => (req: Request[AnyContent]) => req.addAttr(ScalaAttrs.COMMENT_ID, id)),
      feedbackStatus.map(s => (req: Request[AnyContent]) => req.addAttr(ScalaAttrs.FEEDBACK_STATUS, s))
    ).flatten.foldLeft(request)((req, f) => f(req))

    Right(updatedRequest)
