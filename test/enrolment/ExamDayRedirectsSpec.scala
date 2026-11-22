// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.*
import models.exam.{Exam, ExamImplementation, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import org.apache.commons.codec.binary.Base64
import play.api.Application
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import services.datetime.{AppClock, FixedAppClock}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS, MINUTES}
import java.util.UUID

/** The redirect headers a student gets on logging in on the exam day */
class ExamDayRedirectsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  // 08:00 on 13 June in Sydney, still 12 June in UTC
  private val now  = Instant.parse("2030-06-12T22:00:00Z")
  private val Zone = "Australia/Sydney"

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .configure("play.mailer.mock" -> true, "exam.application.timezone" -> Zone)
      .overrides(bind[AppClock].toInstance(FixedAppClock(now)))
      .build()

  // FakeRequest's remote address
  private val Here = "127.0.0.1"

  private def student: User = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get

  private def room: ExamRoom =
    val r = DB.find(classOf[ExamRoom], 1L)
    r.localTimezone = Zone
    r.update()
    r

  /** The room's machines, none of them the one the student is on */
  private def machines: List[ExamMachine] =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())
    val all = DB.find(classOf[ExamMachine]).list
    all.zipWithIndex.foreach { (m, i) =>
      m.ipAddress = s"10.0.0.${i + 1}"
      m.update()
    }
    all.filter(_.room.id == room.id).filterNot(_.outOfService)

  private def sitAt(machine: ExamMachine): Unit =
    machine.ipAddress = Here
    machine.update()

  private def exam(implementation: ExamImplementation = ExamImplementation.AQUARIUM): Exam =
    val e = DB.find(classOf[Exam], 1L)
    e.state = ExamState.PUBLISHED
    e.periodEnd = now.plus(30, DAYS)
    e.implementation = implementation
    e.duration = 60
    e.hash = "hash-1"
    e.update()
    e

  private def booked(machine: ExamMachine, start: Instant): ExamEnrolment =
    val r = new Reservation
    r.user = student
    r.machine = machine
    r.startAt = start
    r.endAt = start.plus(1, HOURS)
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = exam()
    enrolment.user = student
    enrolment.reservation = r
    enrolment.save()
    enrolment

  private def inEvent(implementation: ExamImplementation, start: Instant): ExamEnrolment =
    val e  = exam(implementation)
    val ee = new ExaminationEvent
    ee.start = start
    ee.description = "Event"
    ee.capacity = 10
    ee.save()
    val config = new ExaminationEventConfiguration
    config.exam = e
    config.examinationEvent = ee
    config.hash = UUID.randomUUID().toString
    config.configKey = "not-what-the-browser-sends"
    config.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = student
    enrolment.examinationEventConfiguration = config
    enrolment.save()
    enrolment

  /** The exam-day headers of the login response */
  private def headers(): Map[String, String] =
    val result = runIO(loginRaw("student@funet.fi"))
    statusOf(result) must be(Status.OK)
    result.header.headers.filter(_._1.startsWith("x-exam-")).toMap

  private def decoded(value: String): Seq[String] =
    new String(Base64.decodeBase64(value)).split(":::").toSeq

  "Logging in on the exam day" when:
    "the reservation has started" should:
      "take the student into the exam on their machine" in:
        val mine = machines.head
        sitAt(mine)
        booked(mine, now.minus(10, MINUTES))

        headers() must be(Map("x-exam-start-exam" -> "hash-1"))

      "tell the student on another machine of the room which one to go to" in:
        val ms            = machines
        val (mine, other) = (ms(0), ms(1))
        sitAt(other)
        val enrolment = booked(mine, now.minus(10, MINUTES))

        val h = headers()
        h.keySet must be(Set("x-exam-wrong-machine"))
        decoded(h("x-exam-wrong-machine")) must be(Seq(s"${enrolment.id}", s"${other.id}"))

      "tell the student in another room" in:
        val mine      = machines.head
        val elsewhere = new ExamRoom
        elsewhere.name = "Another room"
        elsewhere.save()
        val there = new ExamMachine
        there.name = "There"
        there.room = elsewhere
        there.save()
        sitAt(there)
        val enrolment = booked(mine, now.minus(10, MINUTES))

        val h = headers()
        decoded(h("x-exam-wrong-room")) must be(Seq(s"${enrolment.id}", s"${there.id}"))

      "describe the reservation, in the room's time, to a student on an unknown computer" in:
        val mine      = machines.head
        val enrolment = booked(mine, now.minus(10, MINUTES))

        val fields = decoded(headers()("x-exam-unknown-machine"))
        fields.head must be(s"${enrolment.id}")
        fields must contain("2030-06-13T07:50:00+10:00")
        fields must contain(Zone)

    "the reservation is later today" should:
      "send the student to wait when it starts within five minutes" in:
        val mine = machines.head
        sitAt(mine)
        val enrolment = booked(mine, now.plus(3, MINUTES))

        headers() must be(Map("x-exam-upcoming-exam" -> s"hash-1:::${enrolment.id}"))

      "let the student log in early for one later in the day, on the organisation's calendar" in:
        val mine = machines.head
        sitAt(mine)
        // 13:00 in Sydney, already 13 June in UTC as well
        val enrolment = booked(mine, now.plus(5, HOURS))

        headers() must be(Map("x-exam-aquarium-login" -> s"hash-1:::${enrolment.id}"))

      "tell that there is no exam today, when the reservation is tomorrow" in:
        val mine = machines.head
        sitAt(mine)
        booked(mine, now.plus(1, DAYS))

        headers() must be(Map("x-exam-upcoming-exam" -> "none"))

    "taking a home exam" should:
      "send the student to wait only just before the event" in:
        machines
        val soon = inEvent(ExamImplementation.WHATEVER, now.plus(3, MINUTES))
        headers() must be(Map("x-exam-upcoming-exam" -> s"hash-1:::${soon.id}"))

        soon.examinationEventConfiguration.examinationEvent.start = now.plus(1, HOURS)
        soon.examinationEventConfiguration.examinationEvent.update()
        headers() must be(Map.empty)

    "taking a SEB exam" should:
      "refuse a browser without the exam's configuration" in:
        machines
        val enrolment = inEvent(ExamImplementation.CLIENT_AUTH, now.minus(10, MINUTES))

        headers() must be(Map(
          "x-exam-wrong-agent-config" ->
            enrolment.examinationEventConfiguration.examinationEvent.start.toString
        ))
