// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package session

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import services.datetime.{AppClock, FixedAppClock}

import java.time.Instant
import java.time.temporal.ChronoUnit.HOURS

/** A student from another organisation logging in to take an exam booked here */
class VisitorLoginSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  // 08:00 on 13 June in Sydney, still 12 June in UTC
  private val now     = Instant.parse("2030-06-12T22:00:00Z")
  private val Visitor = "visitor@other.org"

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder
      .configure("exam.application.timezone" -> "Australia/Sydney")
      .overrides(bind[AppClock].toInstance(FixedAppClock(now)))

  private def machine(ip: String): ExamMachine =
    ensureTestDataLoaded()
    val m = DB.find(classOf[ExamRoom], 1L).examMachines.get(0)
    m.ipAddress = ip
    m.update()
    m

  /** A reservation made through the other organisation, already imported here */
  private def booked(machine: ExamMachine, start: Instant): Reservation =
    val r = new Reservation
    r.machine = machine
    r.startAt = start
    r.endAt = start.plus(1, HOURS)
    r.externalRef = "ext-ref-1"
    r.externalUserRef = Visitor
    r.save()
    val e = new ExamEnrolment
    e.exam = DB.find(classOf[Exam], 1L)
    e.reservation = r
    e.enrolledOn = now
    e.save()
    r

  private def visitor: Option[User] = DB.find(classOf[User]).where().eq("eppn", Visitor).find

  "A visiting student" when:
    "on an exam machine with an exam later that day" should:
      "be let in as a student" in:
        // 11:00 in Sydney, already 13 June in UTC
        booked(machine("127.0.0.1"), now.plus(3, HOURS))

        val result = runIO(loginRaw(Visitor))
        statusOf(result) must be(Status.OK)
        sessionOf(result).get("visitingStudent") must be(Some("true"))
        sessionOf(result).get("role") must be(Some("STUDENT"))
        visitor.map(_.roles.size) must be(Some(0))

    "elsewhere than on an exam machine" should:
      "be turned away with the home organisations" in:
        booked(machine("10.0.0.99"), now.plus(3, HOURS))

        val result = runIO(loginRaw(Visitor))
        statusOf(result) must be(Status.BAD_REQUEST)
        headerOf(result, "x-exam-delay-execution") must be(Some("funet.fi, test.org"))
        visitor must be(empty)

    "with an exam only the next day" should:
      "be turned away" in:
        booked(machine("127.0.0.1"), now.plus(18, HOURS))
        statusOf(runIO(loginRaw(Visitor))) must be(Status.BAD_REQUEST)
