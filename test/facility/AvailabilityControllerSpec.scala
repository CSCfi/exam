// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}
import models.enrolment.Reservation
import models.facility.{ExamMachine, ExamRoom}
import play.api.http.Status
import play.api.libs.json.JsObject
import play.api.mvc.Session

import java.time.{Instant, LocalTime}
import java.util.Date

class AvailabilityControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  // A Wednesday; the room is open 8:00-10:30 UTC on Wednesdays only
  private val day = "2030-06-12"

  private def at(time: String): Instant = Instant.parse(s"${day}T$time:00Z")

  private def setupRoom(): ExamRoom =
    val room = DB.find(classOf[ExamRoom], 1L)
    room.localTimezone = "UTC"
    room.update()
    val hours = new DefaultWorkingHours
    hours.weekday = "Wednesday"
    hours.startTime = LocalTime.of(8, 0)
    hours.endTime = LocalTime.of(10, 30)
    hours.room = room
    hours.save()
    room

  private def reserve(start: String, end: String): Unit =
    val r = new Reservation
    r.startAt = at(start)
    r.endAt = at(end)
    r.machine = DB.find(classOf[ExamMachine]).where().eq("name", "Pegasus 01").find.get
    r.save()

  // (start, end, total, reserved) for each slot of the week
  private def availability(session: Session) =
    val result = runIO(get(s"/app/availability/1/${day}T00:00:00Z", session = session))
    statusOf(result).must(be(Status.OK))
    contentAsJsonOf(result).as[Seq[JsObject]].map { a =>
      (
        (a \ "start").as[String],
        (a \ "end").as[String],
        (a \ "total").as[Int],
        (a \ "reserved").as[Int]
      )
    }.sortBy(_._1)

  "AvailabilityController" when:
    "getting room availability" should:
      "split the opening hours into hourly slots with the reservations in each" in:
        val (_, session) = runIO(loginAsStudent())
        setupRoom()
        reserve("09:15", "09:45")

        // Pegasus 03 is out of service, so two machines are available; 10:30 rounds up to 11:00
        availability(session).must(be(Seq(
          (s"${day}T08:00:00Z", s"${day}T09:00:00Z", 2, 0),
          (s"${day}T09:00:00Z", s"${day}T10:00:00Z", 2, 1),
          (s"${day}T10:00:00Z", s"${day}T11:00:00Z", 2, 0)
        )))

      "leave out the time the room is out of service" in:
        val (_, session) = runIO(loginAsStudent())
        val room         = setupRoom()
        val exception    = new ExceptionWorkingHours
        exception.startDate = Date.from(at("10:00"))
        exception.endDate = Date.from(at("11:00"))
        exception.outOfService = true
        exception.room = room
        exception.save()

        availability(session).map(_._1)
          .must(be(Seq(s"${day}T08:00:00Z", s"${day}T09:00:00Z")))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(get(s"/app/availability/999/${day}T00:00:00Z", session = session)))
          .must(be(Status.NOT_FOUND))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"/app/availability/1/${day}T00:00:00Z", session = session)))
          .must(be(Status.FORBIDDEN))
