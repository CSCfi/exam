// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.calendar

import play.api.libs.json.{JsValue, Json}
import play.api.mvc.*
import validation.scala.core.ScalaAttrs

import scala.concurrent.{ExecutionContext, Future}

object ReservationCreationFilter:
  def apply()(implicit ec: ExecutionContext): ActionRefiner[Request, Request] =
    new ActionRefiner[Request, Request]:
      override protected def executionContext: ExecutionContext = ec

      override protected def refine[A](request: Request[A]): Future[Either[Result, Request[A]]] =
        request.body match
          case body: JsValue =>
            ReservationValidator.forCreation(body) match
              case Right(reservation) =>
                Future.successful(Right(request.addAttr(ScalaAttrs.ATTR_STUDENT_RESERVATION, reservation)))
              case Left(ex) =>
                Future.successful(Left(Results.BadRequest(ex.getMessage)))
          case _ =>
            Future.successful(Left(Results.BadRequest("Expected JSON body")))

  def forExternal()(implicit ec: ExecutionContext): ActionRefiner[Request, Request] =
    new ActionRefiner[Request, Request]:
      override protected def executionContext: ExecutionContext = ec

      override protected def refine[A](request: Request[A]): Future[Either[Result, Request[A]]] =
        request.body match
          case body: JsValue =>
            ReservationValidator.forCreationExternal(body) match
              case Right(reservation) =>
                Future.successful(Right(request.addAttr(ScalaAttrs.ATTR_EXT_RESERVATION, reservation)))
              case Left(ex) =>
                Future.successful(Left(Results.BadRequest(ex.getMessage)))
          case _ =>
            Future.successful(Left(Results.BadRequest("Expected JSON body")))
