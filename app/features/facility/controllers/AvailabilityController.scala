// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.controllers

import features.facility.services.AvailabilityService.Availability
import features.facility.services.{AvailabilityError, AvailabilityService}
import models.user.Role
import play.api.libs.json.{Json, Writes}
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.BlockingIOExecutionContext

import javax.inject.Inject

class AvailabilityController @Inject() (
    private val availabilityService: AvailabilityService,
    val authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController:

  private def toResult(error: AvailabilityError): Result =
    error match
      case AvailabilityError.RoomNotFound => NotFound(AvailabilityError.RoomNotFound.message)

  implicit val availabilityWrites: Writes[Availability] = (a: Availability) =>
    Json.obj(
      "start"    -> a.start,
      "end"      -> a.end,
      "total"    -> a.total,
      "reserved" -> a.reserved
    )

  def getAvailability(roomId: Long, day: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))) { _ =>
      availabilityService.getAvailability(roomId, day) match
        case Left(error)         => toResult(error)
        case Right(availability) => Ok(Json.toJson(availability))
    }
