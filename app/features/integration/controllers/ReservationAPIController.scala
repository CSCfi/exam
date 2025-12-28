// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import database.EbeanJsonExtensions
import features.integration.services.{ReservationAPIError, ReservationAPIService}
import io.ebean.text.PathProperties
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext

import javax.inject.Inject

class ReservationAPIController @Inject() (
    private val reservationAPIService: ReservationAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController
    with EbeanJsonExtensions:

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
      val pp = PathProperties.parse(
        """(startAt, endAt, externalUserRef,
          |user(firstName, lastName, email, userIdentifier),
          |enrolment(noShow,
          |  exam(id, name,
          |    examOwners(firstName, lastName, email),
          |    parent(examOwners(firstName, lastName, email)),
          |    course(name, code, credits, identifier,
          |      gradeScale(description, externalRef, displayName),
          |      organisation(code, name, nameAbbreviation)
          |    )
          |  ),
          |  collaborativeExam(name)
          |),
          |machine(name, ipAddress, otherIdentifier,
          |  room(name, roomCode)
          |)
          |)""".stripMargin
      )
      val reservations = reservationAPIService.getReservations(start, end, roomId)
      Ok(reservations.asJson(pp))
    }

  def getRooms: Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val pp = PathProperties.parse("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))")
      val rooms = reservationAPIService.getRooms
      Ok(rooms.asJson(pp))
    }

  def getRoomOpeningHours(roomId: Long, date: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      date match
        case None => toResult(ReservationAPIError.NoSearchDate)
        case Some(d) =>
          val pp = PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))")
          reservationAPIService.getRoomOpeningHours(roomId, d) match
            case None       => toResult(ReservationAPIError.RoomNotFound)
            case Some(room) => Ok(room.asJson(pp))
    }
