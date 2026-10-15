// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.Reservation
import models.exam.ExamState
import models.facility.ExamRoom
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import services.datetime.TimeUtils

import java.time.{Instant, LocalDate, ZoneOffset}
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

object ReservationAPIService:
  private val PageSize = 1000

class ReservationAPIService @Inject() ()
    extends EbeanQueryExtensions:
  import ReservationAPIService.PageSize

  private val reservationJsonProperties = props[Reservation](
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

  private val roomProperties =
    props[ExamRoom]("(*, defaultWorkingHours(*), mailAddress(*), examMachines(*))")

  private val openingHoursProperties =
    props[ExamRoom]("(*, defaultWorkingHours(*), calendarExceptionEvents(*))")

  /** Reservations ordered by start time, fetched in keyset pages so that memory use does not grow
    * with the requested period. Pages are fetched lazily on `ec` as the stream is pulled. Dates are
    * parsed up front so that invalid input fails before the response starts.
    */
  def getReservations(
      start: Option[String],
      end: Option[String],
      roomId: Option[Long]
  )(using ec: ExecutionContext): (Source[List[Reservation], NotUsed], PathProperties) =
    val startDate = start.map(TimeUtils.parseInstant)
    val endDate   = end.map(TimeUtils.parseInstant)
    val pages = keysetPages(PageSize, (r: Reservation) => (r.startAt, r.id.longValue))(
      fetchPage(startDate, endDate, roomId, _)
    )(identity)
    (pages, reservationJsonProperties)

  private def fetchPage(
      startDate: Option[Instant],
      endDate: Option[Instant],
      roomId: Option[Long],
      after: Option[(Instant, Long)]
  ): List[Reservation] =
    val query = DB.find(classOf[Reservation]).apply(reservationJsonProperties)
    val baseQuery = query
      .where()
      .or()  // *
      .and() // **
      .isNotNull(path[Reservation]("enrolment"))
      .or() // ***
      .isNotNull(path[Reservation]("enrolment.collaborativeExam"))
      .ne(path[Reservation]("enrolment.exam.state"), ExamState.DELETED)
      .endOr()  // ***
      .endAnd() // **
      .isNotNull(path[Reservation]("externalUserRef"))
      .endOr() // *

    val withStart = startDate.fold(baseQuery)(s => baseQuery.ge(path[Reservation]("startAt"), s))
    val withEnd   = endDate.fold(withStart)(e => withStart.lt(path[Reservation]("endAt"), e))
    val withRoom  = roomId.fold(withEnd)(id => withEnd.eq(path[Reservation]("machine.room.id"), id))

    withRoom
      .after(path[Reservation]("startAt"), after)
      .orderBy(s"${path[Reservation]("startAt")}, ${path[Reservation]("id")}")
      .setMaxRows(PageSize)
      .list

  def getRooms: (List[ExamRoom], PathProperties) =
    (
      DB.find(classOf[ExamRoom]).apply(roomProperties).orderBy(path[ExamRoom]("name")).list,
      roomProperties
    )

  def getRoomOpeningHours(roomId: Long, date: String): Option[(ExamRoom, PathProperties)] =
    DB.find(classOf[ExamRoom]).apply(openingHoursProperties).where().idEq(roomId).find match
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
        Some((room, openingHoursProperties))
