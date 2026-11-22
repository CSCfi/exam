// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.enrolment.*
import models.exam.{Exam, ExamExecutionType, ExamState}
import models.iop.{CollaborativeExam, ExternalExam}
import models.user.User
import org.scalatest.BeforeAndAfterEach
import services.enrolment.NoShowHandler

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS}
import java.util.UUID
import java.util.concurrent.atomic.AtomicInteger

/** Marking students who did not turn up, and what follows */
class NoShowHandlingSpec extends BaseIntegrationSpec with BeforeAndAfterEach
    with EbeanQueryExtensions:

  override protected def sendsMail: Boolean = true

  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  override def beforeEach(): Unit =
    super.beforeEach()
    if !greenMail.isRunning then greenMail.start()
    greenMail.purgeEmailFromAllMailboxes()

  override def afterEach(): Unit =
    try if greenMail.isRunning then greenMail.stop()
    finally super.afterEach()

  /** Answers the no-shows posted to XM with `status` */
  private class FakeXm(status: Int) extends HttpServlet:
    val posts = new AtomicInteger
    override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      posts.incrementAndGet()
      resp.setStatus(status)

  private def withXm[A](xm: FakeXm)(test: => A): A =
    val server = RemoteServerHelper.createServer(
      31247,
      false,
      ServletDef.FromInstance(xm) -> List("/api/enrolments/*")
    )
    try test
    finally RemoteServerHelper.shutdownServer(server)

  private def student: User = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get

  private def exam(executionType: String = "PUBLIC"): Exam =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())
    val e = DB.find(classOf[Exam], 1L)
    e.state = ExamState.PUBLISHED
    e.executionType =
      DB.find(classOf[ExamExecutionType]).where().eq("type", executionType).find.get
    e.update()
    e

  /** An enrolment whose reservation ended yesterday */
  private def missed(e: Exam, externalRef: String = null): ExamEnrolment =
    val r = new Reservation
    r.user = student
    r.startAt = Instant.now().minus(1, DAYS)
    r.endAt = r.startAt.plus(2, HOURS)
    r.externalRef = externalRef
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = student
    enrolment.reservation = r
    enrolment.information = "Needs a quiet corner"
    enrolment.save()
    enrolment

  private def handle(enrolments: ExamEnrolment*): Unit =
    app.injector.instanceOf(classOf[NoShowHandler]).handleNoShows(enrolments.toList, Nil)

  private def reload(enrolment: ExamEnrolment): ExamEnrolment =
    DB.find(classOf[ExamEnrolment], enrolment.id)

  private def recipients(count: Int): Seq[String] =
    greenMail.waitForIncomingEmail(5000, count) must be(true)
    greenMail.getReceivedMessages.toSeq.flatMap(_.getAllRecipients.toSeq.map(_.toString))

  "Handling no-shows" when:
    "the student missed a reservation here" should:
      "mark the enrolment and tell the student" in:
        val enrolment = missed(exam())

        handle(enrolment)
        reload(enrolment).noShow must be(true)
        recipients(1) must be(Seq(student.email))
        DB.find(classOf[ExamEnrolment]).where().eq("user", student).list.size must be(1)

      "give a new enrolment to a private exam and tell its teachers" in:
        val e = exam("PRIVATE")
        e.examOwners.add(DB.find(classOf[User]).where().eq("eppn", "teacher@b.funet.fi").find.get)
        e.update()
        val enrolment = missed(e)
        val teachers  = e.examOwners.size + e.examInspections.size
        teachers must be > 0

        handle(enrolment)
        reload(enrolment).noShow must be(true)
        val fresh = DB.find(classOf[ExamEnrolment]).where().eq("user", student).eq("noShow", false)
          .list
        fresh.map(_.information) must be(List("Needs a quiet corner"))
        Option(fresh.head.reservation) must be(None)
        recipients(1 + teachers) must contain(student.email)

      "mark a missed examination event" in:
        val e  = exam()
        val ee = new ExaminationEvent
        ee.start = Instant.now().minus(1, DAYS)
        ee.description = "Event"
        ee.capacity = 5
        ee.save()
        val config = new ExaminationEventConfiguration
        config.exam = e
        config.examinationEvent = ee
        config.hash = UUID.randomUUID().toString
        config.save()
        val enrolment = new ExamEnrolment
        enrolment.exam = e
        enrolment.user = student
        enrolment.examinationEventConfiguration = config
        enrolment.save()

        handle(enrolment)
        reload(enrolment).noShow must be(true)

      "name a collaborative exam in the message" in:
        exam()
        val collaborative = new CollaborativeExam
        collaborative.name = "Yhteistentti"
        collaborative.externalRef = "collab-1"
        collaborative.hash = "collab-hash"
        collaborative.state = ExamState.PUBLISHED
        collaborative.save()
        val enrolment = missed(null)
        enrolment.collaborativeExam = collaborative
        enrolment.update()

        handle(enrolment)
        reload(enrolment).noShow must be(true)
        recipients(1)
        GreenMailUtil.getBody(greenMail.getReceivedMessages.head) must include("Yhteistentti")

      "leave alone an exam no longer open" in:
        val e         = exam()
        val enrolment = missed(e)
        e.state = ExamState.ARCHIVED
        e.update()

        handle(enrolment)
        reload(enrolment).noShow must be(false)

    "the student missed a reservation at another organisation" should:
      "tell XM and mark the enrolment" in:
        val enrolment = missed(exam(), externalRef = "visit-1")
        val xm        = FakeXm(HttpServletResponse.SC_OK)

        withXm(xm)(handle(enrolment))
        xm.posts.get must be(1)
        reload(enrolment).noShow must be(true)

      "try again later while XM fails" in:
        val enrolment = missed(exam(), externalRef = "visit-2")
        val xm        = FakeXm(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

        withXm(xm)(handle(enrolment))
        xm.posts.get must be(1)
        reload(enrolment).noShow must be(false)

      "give up when XM does not know the reservation" in:
        val enrolment = missed(exam(), externalRef = "visit-3")

        withXm(FakeXm(HttpServletResponse.SC_NOT_FOUND))(handle(enrolment))
        reload(enrolment).noShow must be(true)

      "not send it once the student has started the exam there" in:
        val enrolment = missed(exam(), externalRef = "visit-4")
        val started   = new ExternalExam
        started.hash = "visit-4-hash"
        started.externalRef = "visit-4-exam"
        started.creator = student
        started.created = Instant.now().minus(1, DAYS)
        started.started = started.created
        started.content = java.util.Map.of[String, Object]("id", Integer.valueOf(1))
        started.save()
        enrolment.externalExam = started
        enrolment.update()
        val xm = FakeXm(HttpServletResponse.SC_OK)

        withXm(xm)(handle(enrolment))
        xm.posts.get must be(0)
        reload(enrolment).noShow must be(false)
