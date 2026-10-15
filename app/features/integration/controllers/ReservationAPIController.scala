// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import database.EbeanJsonExtensions
import features.integration.services.{ReservationAPIError, ReservationAPIService}
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext
import system.interceptors.SensitiveDataFilter

import javax.inject.Inject

class ReservationAPIController @Inject() (
    private val reservationAPIService: ReservationAPIService,
    private val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

  // Room passwords are stored in plain text and these endpoints need no login
  private val roomSecrets = Set("internalPassword", "externalPassword")

  private def toResult(error: ReservationAPIError): Result =
    error match
      case ReservationAPIError.NoSearchDate => BadRequest(error.message)
      case ReservationAPIError.RoomNotFound => NotFound(error.message)

  def getReservations(
      start: Option[String],
      end: Option[String],
      roomId: Option[Long]
  ): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val (pages, pp) = reservationAPIService.getReservations(start, end, roomId)
      Ok.chunked(pages.asJsonArray(pp)).as(JSON)
    }

  def getRooms: Action[AnyContent] =
    Action.andThen(subjectNotPresent).andThen(sensitiveDataFilter(roomSecrets)) { _ =>
      val (rooms, pp) = reservationAPIService.getRooms
      Ok(rooms.asJson(pp))
    }

  def getRoomOpeningHours(roomId: Long, date: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent).andThen(sensitiveDataFilter(roomSecrets)) { _ =>
      date match
        case None => toResult(ReservationAPIError.NoSearchDate)
        case Some(d) =>
          reservationAPIService.getRoomOpeningHours(roomId, d) match
            case None             => toResult(ReservationAPIError.RoomNotFound)
            case Some((room, pp)) => Ok(room.asJson(pp))
    }
