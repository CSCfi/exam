// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.iop.ExternalExam
import models.user.User
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import services.enrolment.NoShowHandler
import system.jobs.AssessmentTransferService

import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** Items the scheduled jobs send to XM leave the pipeline once retrying cannot help. */
class IopDeliveryJobsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** Answers every POST with `status` and records the path and body. */
  private class FakeXm(status: Int) extends HttpServlet:
    val requests = new ConcurrentLinkedQueue[(String, String)]()
    override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      requests.add(req.getRequestURI -> new String(req.getInputStream.readAllBytes()))
      resp.setStatus(status)
      resp.getWriter.write("""{"message": "from fake XM"}""")
    def paths(ref: String): List[String] =
      requests.asScala.map(_._1).filter(_.contains(ref)).toList

  private def withXm[A](xm: Option[FakeXm])(test: => A): A =
    val server: Option[Server] = xm.map(servlet =>
      RemoteServerHelper.createServer(
        31247,
        false,
        ServletDef.FromInstance(servlet) -> List("/api/enrolments/*")
      )
    )
    try test
    finally server.foreach(RemoteServerHelper.shutdownServer)

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  // No-shows ---------------------------------------------------------------------------------

  private def visitorReservation(ref: String, endedDaysAgo: Int): Reservation =
    val r = new Reservation
    r.startAt = DateTime.now.minusDays(endedDaysAgo).minusHours(2)
    r.endAt = DateTime.now.minusDays(endedDaysAgo)
    r.externalRef = ref
    r.externalUserRef = "visitor@other.fi"
    r.save()
    r

  private def sendNoShow(r: Reservation): Boolean =
    app.injector.instanceOf(classOf[NoShowHandler]).handleNoShows(Nil, List(r))
    DB.find(classOf[Reservation], r.id).sentAsNoShow

  // Assessment transfers ----------------------------------------------------------------------

  private def finishedVisit(ref: String, finishedDaysAgo: Int): ExternalExam =
    val finished = DateTime.now.minusDays(finishedDaysAgo)
    val student  = new User
    student.email = s"$ref@retention.test"
    student.eppn = s"$ref@retention.test"
    student.save()
    val reservation = new Reservation
    reservation.startAt = finished.minusHours(2)
    reservation.endAt = finished
    reservation.externalRef = ref
    reservation.user = student
    reservation.save()
    val ee = new ExternalExam
    ee.hash = s"hash-$ref"
    ee.externalRef = s"exam-$ref"
    ee.creator = student
    ee.created = finished.minusHours(2)
    ee.started = finished.minusHours(2)
    ee.finished = finished
    ee.content = Map[String, Object]("id" -> Integer.valueOf(1)).asJava
    ee.save()
    val enrolment = new ExamEnrolment
    enrolment.user = student
    enrolment.exam = DB.find(classOf[Exam]).where().isNull("parent").setMaxRows(1).find.get
    enrolment.reservation = reservation
    enrolment.externalExam = ee
    enrolment.save()
    ee

  private def transfer(): Unit =
    runIO(app.injector.instanceOf(classOf[AssessmentTransferService]).runCheck())

  private def reload(ee: ExternalExam) = DB.find(classOf[ExternalExam], ee.id)

  "No-show sending" when:
    "XM takes it" should:
      "mark it sent" in:
        setup()
        val r = visitorReservation("ns-ok", 1)
        withXm(Some(FakeXm(HttpServletResponse.SC_OK)))(sendNoShow(r)) mustBe true

    "XM no longer knows the reservation" should:
      "stop sending it" in:
        setup()
        val r = visitorReservation("ns-gone", 1)
        withXm(Some(FakeXm(HttpServletResponse.SC_NOT_FOUND)))(sendNoShow(r)) mustBe true

    "XM fails" should:
      "retry a recent one" in:
        setup()
        val r = visitorReservation("ns-recent", 1)
        withXm(Some(FakeXm(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)))(sendNoShow(r)) mustBe
          false

      "stop sending one that ended over 30 days ago" in:
        setup()
        val r = visitorReservation("ns-old", 31)
        withXm(Some(FakeXm(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)))(sendNoShow(r)) mustBe
          true

    "XM cannot be reached" should:
      "retry a recent one and stop sending an old one" in:
        setup()
        val recent = visitorReservation("ns-down-recent", 1)
        val old    = visitorReservation("ns-down-old", 31)
        withXm(None)(sendNoShow(recent)) mustBe false
        withXm(None)(sendNoShow(old)) mustBe true

  "Assessment transfer" when:
    "XM takes the attempt" should:
      "mark it sent, without sending local-only fields" in:
        setup()
        val ee = finishedVisit("at-ok", 1)
        val xm = FakeXm(HttpServletResponse.SC_CREATED)
        withXm(Some(xm))(transfer())
        Option(reload(ee).sent) must not be None
        Option(reload(ee).deliveryAbandonedAt) mustBe None
        val body = xm.requests.asScala.find(_._1.contains("at-ok")).map(_._2).get
        body must not include "deliveryAbandonedAt"

    "XM no longer knows the reservation" should:
      "take the attempt out of the pipeline and keep it" in:
        setup()
        val ee = finishedVisit("at-gone", 1)
        val xm = FakeXm(HttpServletResponse.SC_NOT_FOUND)
        withXm(Some(xm)) {
          transfer()
          transfer()
        }
        xm.paths("at-gone").size mustBe 1
        Option(reload(ee).sent) mustBe None
        Option(reload(ee).deliveryAbandonedAt) must not be None
        reload(ee).content.isEmpty mustBe false

    "XM fails" should:
      "retry a recent attempt" in:
        setup()
        val ee = finishedVisit("at-recent", 1)
        val xm = FakeXm(HttpServletResponse.SC_BAD_GATEWAY)
        withXm(Some(xm)) {
          transfer()
          transfer()
        }
        xm.paths("at-recent").size mustBe 2
        Option(reload(ee).deliveryAbandonedAt) mustBe None

      "keep an attempt finished over 30 days ago, and retry it once a week" in:
        setup()
        val ee = finishedVisit("at-old", 31)
        val xm = FakeXm(HttpServletResponse.SC_BAD_GATEWAY)
        withXm(Some(xm)) {
          transfer()
          // Tried again only a week after the last attempt
          transfer()
        }
        xm.paths("at-old").size mustBe 1
        Option(reload(ee).deliveryAbandonedAt) mustBe None
        Option(reload(ee).deliveryAttemptedAt) must not be None

        val stale = reload(ee)
        stale.deliveryAttemptedAt = DateTime.now.minusDays(8)
        stale.update()
        val fixed = FakeXm(HttpServletResponse.SC_CREATED)
        withXm(Some(fixed))(transfer())
        fixed.paths("at-old").size mustBe 1
        Option(reload(ee).sent) must not be None
