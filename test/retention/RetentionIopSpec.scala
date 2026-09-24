// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import database.EbeanQueryExtensions
import features.retention.services.*
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.Exam
import models.iop.ExternalExam
import models.user.{Role, User}
import org.eclipse.jetty.server.Server
import org.joda.time.{DateTime, DateTimeZone, Period}
import services.datetime.FixedAppClock

import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** The XM side of retention, against a fake XM on the port integrationtest.conf points at. */
class RetentionIopSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private val t0 = new DateTime(2023, 3, 1, 10, 0, DateTimeZone.UTC)

  private val policy = RetentionPolicy(
    inactivity = Period.months(6),
    booking = Period.years(2),
    attempt = Period.months(6),
    maturityAttempt = Period.months(6),
    abortedAttempt = Period.years(1),
    autoLock = Period.years(1),
    record = Period.years(2),
    hostCopy = Period.months(3),
    dryRun = false,
    batchSize = 500
  )

  /** Answers every DELETE with `status` and records the path and anything `observe` reports. */
  private class FakeXm(status: Int, observe: () => String = () => "") extends HttpServlet:
    val requests = new ConcurrentLinkedQueue[(String, String)]()
    override def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      requests.add(req.getRequestURI -> observe())
      resp.setStatus(status)

  private def withXm[A](xm: FakeXm)(test: => A): A =
    val server: Server = RemoteServerHelper.createServer(
      31247,
      false,
      ServletDef.FromInstance(xm) -> List("/api/organisations/*", "/api/attachments/*")
    )
    try test
    finally RemoteServerHelper.shutdownServer(server)

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  private def client = app.injector.instanceOf(classOf[XmRetentionClient])

  private def service(now: DateTime) =
    RetentionService(
      policy,
      app.injector.instanceOf(classOf[RetentionRepository]),
      client,
      FixedAppClock(now)
    )

  private def visitingReservation(externalRef: String = "xm-doc"): Reservation =
    val external = new ExternalReservation
    external.orgRef = "host-org"
    external.roomRef = "host-room"
    external.save()
    val reservation = new Reservation
    reservation.startAt = t0
    reservation.endAt = t0.plusHours(2)
    reservation.externalRef = externalRef
    reservation.externalReservation = external
    reservation.save()
    reservation

  /** A pure student with one visiting booking at another organisation. */
  private def visitingBooking(): (User, ExamEnrolment) =
    val student = new User
    student.email = "visitor@retention.test"
    student.eppn = "visitor@retention.test"
    student.roles =
      List(DB.find(classOf[Role]).where().eq("name", Role.Name.STUDENT.toString).find.get).asJava
    student.lastLogin = t0.toDate
    student.save()
    val reservation = visitingReservation()
    reservation.user = student
    reservation.update()
    val enrolment = new ExamEnrolment
    enrolment.user = student
    enrolment.exam = DB.find(classOf[Exam]).where().isNull("parent").setMaxRows(1).find.get
    enrolment.reservation = reservation
    enrolment.enrolledOn = t0.minusDays(10)
    enrolment.save()
    (student, enrolment)

  private def hostCopy(sent: DateTime, attachmentId: String): ExternalExam =
    val json =
      s"""{"id": 1, "examSections": [{"sectionQuestions": [
         |  {"essayAnswer": {"answer": "text", "attachment": {"externalId": "$attachmentId"}}}
         |]}]}""".stripMargin
    val ee = new ExternalExam
    ee.hash = s"hash-$attachmentId"
    ee.externalRef = s"ref-$attachmentId"
    ee.created = sent.minusHours(3)
    ee.sent = sent
    ee.content = new ObjectMapper().readValue(json, classOf[java.util.Map[String, Object]])
    ee.save()
    ee

  "XmRetentionClient" when:
    "deleting a visiting reservation" should:
      "call XM's originator route for the reservation" in:
        setup()
        val xm = FakeXm(HttpServletResponse.SC_OK)
        withXm(xm) {
          runIO(client.deleteReservation(visitingReservation("doc-1")))
        }
        xm.requests.asScala.map(_._1).toList mustBe
          List("/api/organisations/host-org/facilities/host-room/reservations/doc-1")

      "treat a document XM no longer has as deleted" in:
        setup()
        withXm(FakeXm(HttpServletResponse.SC_NOT_FOUND)) {
          runIO(client.deleteReservation(visitingReservation()))
        }

      "fail on any other error" in:
        setup()
        withXm(FakeXm(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)) {
          an[XmRequestFailed] must be thrownBy runIO(
            client.deleteReservation(visitingReservation())
          )
        }

      "fail without the external reservation data" in:
        setup()
        val reservation = visitingReservation()
        reservation.externalReservation = null
        an[IllegalStateException] must be thrownBy runIO(client.deleteReservation(reservation))

  "RetentionService with XM" when:
    "a visiting booking is due" should:
      "delete it at XM while the local rows still exist, then locally" in:
        setup()
        val (student, enrolment) = visitingBooking()
        val xm = FakeXm(
          HttpServletResponse.SC_OK,
          () => Option(DB.find(classOf[ExamEnrolment], enrolment.id)).fold("gone")(_ => "present")
        )

        withXm(xm)(runIO(service(t0.plusYears(3)).run(dryRun = false)))

        xm.requests.asScala.toList mustBe List(
          "/api/organisations/host-org/facilities/host-room/reservations/xm-doc" -> "present"
        )
        Option(DB.find(classOf[ExamEnrolment], enrolment.id)) mustBe None
        Option(DB.find(classOf[User], student.id)) mustBe None

      "keep the booking and the account when XM fails, and retry on the next run" in:
        setup()
        val (student, enrolment) = visitingBooking()

        val failed = withXm(FakeXm(HttpServletResponse.SC_BAD_GATEWAY)) {
          runIO(service(t0.plusYears(3)).run(dryRun = false))
        }
        failed.passes.find(_.name.startsWith("D bookings")).map(_.failed) mustBe Some(1)
        DB.find(classOf[ExamEnrolment], enrolment.id).reservation.externalRef mustBe "xm-doc"
        Option(DB.find(classOf[User], student.id)) must not be None

        withXm(FakeXm(HttpServletResponse.SC_NOT_FOUND)) {
          runIO(service(t0.plusYears(3)).run(dryRun = false))
        }
        Option(DB.find(classOf[ExamEnrolment], enrolment.id)) mustBe None
        Option(DB.find(classOf[User], student.id)) mustBe None

    "host copies of visiting attempts exist" should:
      "delete their attachments at XM and clear the content after three months" in:
        setup()
        val now     = t0.plusMonths(3)
        val expired = hostCopy(t0, "att-old")
        val recent  = hostCopy(t0.plusMonths(2), "att-new")
        val xm      = FakeXm(HttpServletResponse.SC_OK)

        withXm(xm)(runIO(service(now).run(dryRun = false)))

        xm.requests.asScala.map(_._1).toSet must contain allOf (
          "/api/attachments/att-old",
          "/api/attachments/att-new"
        )
        DB.find(classOf[ExternalExam], expired.id).content.isEmpty mustBe true
        DB.find(classOf[ExternalExam], recent.id).content.isEmpty mustBe false
