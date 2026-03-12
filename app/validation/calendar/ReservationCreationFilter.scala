// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.calendar

import org.joda.time.DateTime
import play.api.libs.json.JsValue
import play.api.mvc.*
import services.datetime.AppClock
import validation.core.ScalaAttrs

import scala.concurrent.{ExecutionContext, Future}

object ReservationCreationFilter:
  def apply(clock: AppClock)(implicit ec: ExecutionContext): ActionRefiner[Request, Request] =
    new ActionRefiner[Request, Request]:
      override protected def executionContext: ExecutionContext = ec

      override protected def refine[A](request: Request[A]): Future[Either[Result, Request[A]]] =
        request.body match
          case body: JsValue =>
            ReservationValidator.forCreation(body, clock.now()) match
              case Right(reservation) =>
                Future.successful(Right(request.addAttr(
                  ScalaAttrs.ATTR_STUDENT_RESERVATION,
                  reservation
                )))
              case Left(ex) =>
                Future.successful(Left(Results.BadRequest(ex.getMessage)))
          case _ =>
            Future.successful(Left(Results.BadRequest("Expected JSON body")))

  def forExternal(clock: AppClock)(implicit ec: ExecutionContext): ActionRefiner[Request, Request] =
    new ActionRefiner[Request, Request]:
      override protected def executionContext: ExecutionContext = ec

      override protected def refine[A](request: Request[A]): Future[Either[Result, Request[A]]] =
        request.body match
          case body: JsValue =>
            ReservationValidator.forCreationExternal(body, clock.now()) match
              case Right(reservation) =>
                Future.successful(Right(request.addAttr(
                  ScalaAttrs.ATTR_EXT_RESERVATION,
                  reservation
                )))
              case Left(ex) =>
                Future.successful(Left(Results.BadRequest(ex.getMessage)))
          case _ =>
            Future.successful(Left(Results.BadRequest("Expected JSON body")))
