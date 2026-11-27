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
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, LocalDate}
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

object ReservationAPIService:
  private val PageSize = 1000

class ReservationAPIService @Inject() (dateTimeHandler: DateTimeHandler)
    extends EbeanQueryExtensions:
  import ReservationAPIService.PageSize

  private val reservationProperties =
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

  private val reservationJsonProperties = PathProperties.parse(reservationProperties)

  // Same graph as the response, plus the room timezone that normalizing start/end times reads.
  // Without it every partially loaded room is lazy loaded again; it stays out of the JSON since
  // that is rendered with reservationJsonProperties.
  private val reservationFetchProperties =
    val pp = PathProperties.parse(reservationProperties)
    pp.addToPath("machine.room", "localTimezone")
    pp

  private val roomProperties =
    PathProperties.parse("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))")

  private val openingHoursProperties =
    PathProperties.parse("(*, defaultWorkingHours(*), calendarExceptionEvents(*))")

  /** Reservations ordered by start time, fetched in keyset pages so that memory use does not grow
    * with the requested period. Pages are fetched lazily on `ec` as the stream is pulled. Dates are
    * parsed up front so that invalid input fails before the response starts.
    */
  def getReservations(
      start: Option[String],
      end: Option[String],
      roomId: Option[Long]
  )(using ec: ExecutionContext): (Source[List[Reservation], NotUsed], PathProperties) =
    val startDate = start.map(ISODateTimeFormat.dateTimeParser().parseDateTime)
    val endDate   = end.map(ISODateTimeFormat.dateTimeParser().parseDateTime)
    // The key is taken from the stored start time, before normalizing changes it
    val pages = keysetPages(PageSize, (r: Reservation) => (r.startAt, r.id.longValue))(
      fetchPage(startDate, endDate, roomId, _)
    ) { rows =>
      rows.foreach { r =>
        r.startAt = dateTimeHandler.normalize(r.startAt, r)
        r.endAt = dateTimeHandler.normalize(r.endAt, r)
      }
      rows
    }
    (pages, reservationJsonProperties)

  private def fetchPage(
      startDate: Option[DateTime],
      endDate: Option[DateTime],
      roomId: Option[Long],
      after: Option[(DateTime, Long)]
  ): List[Reservation] =
    val query = DB.find(classOf[Reservation]).apply(reservationFetchProperties)
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

    val withStart = startDate.fold(baseQuery)(s => baseQuery.ge("startAt", s.toDate))
    val withEnd   = endDate.fold(withStart)(e => withStart.lt("endAt", e.toDate))
    val withRoom  = roomId.fold(withEnd)(id => withEnd.eq("machine.room.id", id))

    withRoom.after("startAt", after).orderBy("startAt, id").setMaxRows(PageSize).list

  def getRooms: (List[ExamRoom], PathProperties) =
    (DB.find(classOf[ExamRoom]).apply(roomProperties).orderBy("name").list, roomProperties)

  def getRoomOpeningHours(roomId: Long, date: String): Option[(ExamRoom, PathProperties)] =
    DB.find(classOf[ExamRoom]).apply(openingHoursProperties).where().idEq(roomId).find match
      case None => None
      case Some(room) =>
        val searchDate = ISODateTimeFormat.dateParser().parseLocalDate(date)
        val filteredEvents = room.calendarExceptionEvents.asScala.filter { ee =>
          val start = new LocalDate(ee.startDate).withDayOfMonth(1)
          val end   = new LocalDate(ee.endDate).dayOfMonth().withMaximumValue()
          !start.isAfter(searchDate) && !end.isBefore(searchDate)
        }
        room.calendarExceptionEvents = filteredEvents.asJava
        Some((room, openingHoursProperties))
