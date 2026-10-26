// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.calendar.DefaultWorkingHours
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import org.scalatest.BeforeAndAfterEach
import play.api.Application
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.Session
import services.datetime.{AppClock, FixedAppClock, TimeUtils}

import java.time.*
import java.time.format.DateTimeFormatter
import scala.jdk.CollectionConverters.*

class ReservationControllerSpec extends BaseIntegrationSpec with BeforeAndAfterEach
    with EbeanQueryExtensions:

  // Anchored to today at 12:15, so that a reservation can have started a moment ago and the room
  // still has later slots to offer. Off the hour, so that "the next slot" is never ambiguous.
  val fixedNow: Instant = LocalDate.now().atTime(12, 15).atZone(ZoneOffset.UTC).toInstant

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .overrides(bind[AppClock].toInstance(FixedAppClock(fixedNow)))
      .build()

  private def setWorkingHours(room: ExamRoom): Unit =
    val days = Array("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")
    days.foreach { day =>
      val dwh = new DefaultWorkingHours()
      dwh.weekday = day
      dwh.room = room
      dwh.startTime = LocalTime.MIDNIGHT
      dwh.endTime = LocalTime.of(20, 59, 59, 999_000_000)
      dwh.save()
    }

  private def setupOngoingReservation(): (Reservation, ExamRoom, ExamMachine) =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val exam = DB.find(classOf[Exam]).where().eq("state", ExamState.PUBLISHED).list.headOption match
      case Some(e) =>
        e.duration = 60
        e.softwares.clear()
        e.update()
        e
      case None => fail("No published exam found")

    val user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    setWorkingHours(room)

    val machines = room.examMachines.asScala.filterNot(_.outOfService).toList
    machines must have size 2

    // Started half an hour ago, so mid-exam from the admin's point of view
    val reservation = new Reservation()
    reservation.user = user
    reservation.machine = machines.head
    reservation.startAt = fixedNow.minus(Duration.ofMinutes(30))
    reservation.endAt = reservation.startAt.plus(Duration.ofMinutes(exam.duration.toLong))
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.exam = exam
    enrolment.user = user
    enrolment.reservation = reservation
    enrolment.save()

    (reservation, room, machines(1))

  private def asLocalTime(instant: Instant, room: ExamRoom): String =
    DateTimeFormatter.ofPattern("HH:mm")
      .withZone(TimeUtils.zoneIdOf(room.localTimezone))
      .format(instant)

  private def availableMachines(
      reservation: Reservation,
      room: ExamRoom,
      session: Session
  ): JsArray =
    val result =
      runIO(get(s"/app/reservations/${reservation.id}/${room.id}/machines", session = session))
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray]

  private def changeMachine(
      reservation: Reservation,
      machine: ExamMachine,
      slot: Option[JsValue],
      session: Session
  ) =
    val body = Json.obj("machineId" -> JsNumber(BigDecimal(machine.id))) ++ slot.fold(Json.obj()) {
      s => Json.obj("start" -> (s \ "start").as[String], "end" -> (s \ "end").as[String])
    }
    runIO(put(s"/app/reservations/${reservation.id}/machine", body, session))

  private def parse(slot: JsValue, field: String): Instant =
    TimeUtils.parseInstant((slot \ field).as[String])

  "ReservationController" when:
    "changing the machine of a reservation that has already started" should:
      "offer both the reservation's own time and the next slot" in:
        val (_, session)           = runIO(loginAsAdmin())
        val (reservation, room, _) = setupOngoingReservation()

        val machines = availableMachines(reservation, room, session).value
        machines must have size 1
        val slots = (machines.head \ "slots").as[JsArray].value
        slots must have size 2

        // The ongoing time comes first
        val ongoing = slots.head
        parse(ongoing, "start") must be(reservation.startAt)
        parse(ongoing, "end") must be(reservation.endAt)
        (ongoing \ "startAt").as[String] must be(asLocalTime(reservation.startAt, room))
        (ongoing \ "endAt").as[String] must be(asLocalTime(reservation.endAt, room))

        // Followed by the next slot the room can offer. It is an alternative to the ongoing time,
        // not a booking after it, so it may well start before the ongoing one ends
        val next = slots(1)
        parse(next, "start").isAfter(parse(ongoing, "start")) must be(true)
        (next \ "startAt").as[String] must be(asLocalTime(parse(next, "start"), room))

      "keep the original time when the ongoing slot is picked" in:
        val (_, session)                        = runIO(loginAsAdmin())
        val (reservation, room, anotherMachine) = setupOngoingReservation()
        val originalStart                       = reservation.startAt
        val originalEnd                         = reservation.endAt
        val ongoing = (availableMachines(reservation, room, session).value.head \ "slots")
          .as[JsArray]
          .value
          .head

        val result = changeMachine(reservation, anotherMachine, Some(ongoing), session)
        statusOf(result) must be(Status.OK)

        Option(DB.find(classOf[Reservation], reservation.id)) match
          case Some(updated) =>
            updated.machine.id must be(anotherMachine.id)
            updated.startAt must be(originalStart)
            updated.endAt must be(originalEnd)
          case None => fail("Reservation not found")

      "move the reservation when the next slot is picked" in:
        val (_, session)                        = runIO(loginAsAdmin())
        val (reservation, room, anotherMachine) = setupOngoingReservation()
        val next =
          (availableMachines(reservation, room, session).value.head \ "slots").as[JsArray].value(1)

        val result = changeMachine(reservation, anotherMachine, Some(next), session)
        statusOf(result) must be(Status.OK)

        Option(DB.find(classOf[Reservation], reservation.id)) match
          case Some(updated) =>
            updated.machine.id must be(anotherMachine.id)
            updated.startAt must be(parse(next, "start"))
            updated.endAt must be(parse(next, "end"))
          case None => fail("Reservation not found")

      "refuse a slot that was not offered" in:
        val (_, session)                     = runIO(loginAsAdmin())
        val (reservation, _, anotherMachine) = setupOngoingReservation()
        val originalMachine                  = reservation.machine
        val printer                          = DateTimeFormatter.ISO_INSTANT
        val threeDaysOn                      = fixedNow.plus(Duration.ofDays(3))
        val slot = Json.obj(
          "start" -> printer.format(threeDaysOn),
          "end"   -> printer.format(threeDaysOn.plus(Duration.ofHours(1)))
        )

        val result = changeMachine(reservation, anotherMachine, Some(slot), session)
        statusOf(result) must be(Status.FORBIDDEN)

        Option(DB.find(classOf[Reservation], reservation.id)) match
          case Some(updated) => updated.machine.id must be(originalMachine.id)
          case None          => fail("Reservation not found")

      "keep the original time when no slot is picked" in:
        val (_, session)                     = runIO(loginAsAdmin())
        val (reservation, _, anotherMachine) = setupOngoingReservation()
        val originalStart                    = reservation.startAt

        val result = changeMachine(reservation, anotherMachine, None, session)
        statusOf(result) must be(Status.OK)

        Option(DB.find(classOf[Reservation], reservation.id)) match
          case Some(updated) =>
            updated.machine.id must be(anotherMachine.id)
            updated.startAt must be(originalStart)
          case None => fail("Reservation not found")
