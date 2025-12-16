// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.Reservation
import models.exam.Exam
import models.facility.ExamRoom
import org.joda.time.LocalDate
import org.joda.time.format.ISODateTimeFormat
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ReservationAPIService @Inject() (dateTimeHandler: DateTimeHandler) extends EbeanQueryExtensions:

  def getReservations(start: Option[String], end: Option[String], roomId: Option[Long]): List[Reservation] =
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
    val query = DB.find(classOf[Reservation])
    pp.apply(query)
    val baseQuery = query
      .where()
      .or()  // *
      .and() // **
      .isNotNull("enrolment")
      .or() // ***
      .isNotNull("enrolment.collaborativeExam")
      .ne("enrolment.exam.state", Exam.State.DELETED)
      .endOr()  // ***
      .endAnd() // **
      .isNotNull("externalUserRef")
      .endOr() // *

    val withStart = start.fold(baseQuery) { s =>
      val startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(s)
      baseQuery.ge("startAt", startDate.toDate)
    }

    val withEnd = end.fold(withStart) { e =>
      val endDate = ISODateTimeFormat.dateTimeParser().parseDateTime(e)
      withStart.lt("endAt", endDate.toDate)
    }

    val finalQuery = roomId.fold(withEnd) { id =>
      withEnd.eq("machine.room.id", id)
    }

    finalQuery.distinct.toList
      .map { r =>
        r.setStartAt(dateTimeHandler.normalize(r.getStartAt, r))
        r.setEndAt(dateTimeHandler.normalize(r.getEndAt, r))
        r
      }
      .sortBy(r => r.getStartAt.getMillis)

  def getRooms: List[ExamRoom] =
    val pp    = PathProperties.parse("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))")
    val query = DB.find(classOf[ExamRoom])
    pp.apply(query)
    query.orderBy("name").list

  def getRoomOpeningHours(roomId: Long, date: String): Option[ExamRoom] =
    val pp    = PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))")
    val query = DB.find(classOf[ExamRoom])
    pp.apply(query)
    query.where().idEq(roomId).find match
      case None => None
      case Some(room) =>
        val searchDate = ISODateTimeFormat.dateParser().parseLocalDate(date)
        val filteredEvents = room.getCalendarExceptionEvents.asScala.filter { ee =>
          val start = new LocalDate(ee.getStartDate).withDayOfMonth(1)
          val end   = new LocalDate(ee.getEndDate).dayOfMonth().withMaximumValue()
          !start.isAfter(searchDate) && !end.isBefore(searchDate)
        }
        room.setCalendarExceptionEvents(filteredEvents.asJava)
        Some(room)
