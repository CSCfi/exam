// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.Reservation
import models.exam.ExamState
import models.facility.ExamRoom
import services.datetime.TimeUtils

import java.time.{LocalDate, ZoneOffset}
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ReservationAPIService @Inject() ()
    extends EbeanQueryExtensions:

  def getReservations(
      start: Option[String],
      end: Option[String],
      roomId: Option[Long]
  ): List[Reservation] =
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
    val query = DB.find(classOf[Reservation]).apply(pp)
    val baseQuery = query
      .where()
      .or()  // *
      .and() // **
      .isNotNull("enrolment")
      .or() // ***
      .isNotNull("enrolment.collaborativeExam")
      .ne("enrolment.exam.state", ExamState.DELETED)
      .endOr()  // ***
      .endAnd() // **
      .isNotNull("externalUserRef")
      .endOr() // *

    val withStart = start.fold(baseQuery)(s => baseQuery.ge("startAt", TimeUtils.parseInstant(s)))
    val withEnd   = end.fold(withStart)(e => withStart.lt("endAt", TimeUtils.parseInstant(e)))

    val finalQuery = roomId.fold(withEnd) { id =>
      withEnd.eq("machine.room.id", id)
    }

    finalQuery.distinct.toList.sortBy(_.startAt.toEpochMilli)

  def getRooms: List[ExamRoom] =
    val pp = PathProperties.parse("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))")
    DB.find(classOf[ExamRoom]).apply(pp).orderBy("name").list

  def getRoomOpeningHours(roomId: Long, date: String): Option[ExamRoom] =
    val pp = PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))")
    DB.find(classOf[ExamRoom]).apply(pp).where().idEq(roomId).find match
      case None => None
      case Some(room) =>
        val searchDate = LocalDate.parse(date)
        val filteredEvents = room.calendarExceptionEvents.asScala.filter { ee =>
          val start = ee.startDate.toInstant.atZone(ZoneOffset.UTC).toLocalDate.withDayOfMonth(1)
          val end = ee.endDate.toInstant.atZone(ZoneOffset.UTC).toLocalDate.withDayOfMonth(
            ee.endDate.toInstant.atZone(ZoneOffset.UTC).toLocalDate.lengthOfMonth
          )
          !start.isAfter(searchDate) && !end.isBefore(searchDate)
        }
        room.calendarExceptionEvents = filteredEvents.asJava
        Some(room)
