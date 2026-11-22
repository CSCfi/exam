// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.InstantArithmetic.*
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.attachment.Attachment
import models.enrolment.ExamParticipation
import models.exam.{Exam, ExamState}
import models.iop.{CollaborativeExam, ExternalExam}
import models.questions.{EssayAnswer, Question}
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import org.eclipse.jetty.server.Server
import system.jobs.{CollaborativeAssessmentSenderService, ExternalExamExpirationService}

import java.time.{Instant, ZoneOffset}
import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** The jobs that send collaborative attempts to XM and clear out old visits */
class IopHousekeepingJobsSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** Answers POSTs with `status`, and records every request */
  private class FakeXm(status: Int) extends HttpServlet:
    val requests = new ConcurrentLinkedQueue[(String, String)]()
    override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      requests.add("POST" -> req.getRequestURI)
      resp.setStatus(status)
      resp.getWriter.write("""{"rev": "rev-2"}""")
    override def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      requests.add("DELETE" -> req.getRequestURI)
      resp.setStatus(200)

  private def withXm[A](xm: FakeXm)(test: => A): A =
    val server: Server = RemoteServerHelper.createServer(
      31247,
      false,
      ServletDef.FromInstance(xm) -> List("/api/exams/*", "/api/attachments/*")
    )
    try test
    finally RemoteServerHelper.shutdownServer(server)

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  private def student(name: String): User =
    val u = new User
    u.eppn = s"$name@iop.test"
    u.email = u.eppn
    u.save()
    u

  // Collaborative attempts -------------------------------------------------------------------

  /** A finished attempt at a collaborative exam, waiting for review */
  private def collaborativeAttempt(ref: String, endedDaysAgo: Int): ExamParticipation =
    val ce = new CollaborativeExam
    ce.externalRef = ref
    ce.hash = s"hash-$ref"
    ce.name = ref
    ce.state = ExamState.PUBLISHED
    ce.save()
    val attempt = new Exam
    attempt.name = ref
    attempt.state = ExamState.REVIEW
    attempt.generateHash()
    attempt.save()
    val p = new ExamParticipation
    p.exam = attempt
    p.collaborativeExam = ce
    p.user = student(ref)
    p.started = Instant.now().minusDays(endedDaysAgo).minusHours(1)
    p.ended = Instant.now().minusDays(endedDaysAgo)
    p.save()
    p

  private def send(): Unit =
    runIO(app.injector.instanceOf(classOf[CollaborativeAssessmentSenderService]).runCheck())

  private def reload(p: ExamParticipation) = DB.find(classOf[ExamParticipation], p.id)

  "Collaborative assessment sending" when:
    "XM takes the attempt" should:
      "mark it sent for review, once" in:
        setup()
        val xm = FakeXm(201)
        withXm(xm) {
          val p = collaborativeAttempt("collab-ok", 0)
          send()
          reload(p).sentForReview must not be null
          send()
          xm.requests.asScala.count(_._2 == "/api/exams/collab-ok/assessments") must be(1)
        }

    "XM no longer knows the exam" should:
      "stop sending it and keep the attempt" in:
        setup()
        withXm(FakeXm(404)) {
          val p = collaborativeAttempt("collab-gone", 0)
          send()
          reload(p).deliveryAbandonedAt must not be null
          reload(p).sentForReview must be(null)
        }

    "XM fails" should:
      "try again later" in:
        setup()
        withXm(FakeXm(500)) {
          val p = collaborativeAttempt("collab-retry", 0)
          send()
          reload(p).deliveryAttemptedAt must not be null
          reload(p).deliveryAbandonedAt must be(null)
          reload(p).sentForReview must be(null)
        }

  // External exams ---------------------------------------------------------------------------

  /** A visit sent home `monthsAgo`, with one essay attachment stored in XM */
  private def sentVisit(name: String, monthsAgo: Int, attachmentId: Option[String]): ExternalExam =
    val content = new Exam
    content.id = 1L
    content.name = name
    val section = new ExamSection
    val esq     = new ExamSectionQuestion
    esq.question = DB.find(classOf[Question]).setMaxRows(1).findOne()
    attachmentId.foreach { id =>
      val answer     = new EssayAnswer
      val attachment = new Attachment
      attachment.externalId = id
      attachment.fileName = s"$id.pdf"
      answer.attachment = attachment
      esq.essayAnswer = answer
    }
    section.sectionQuestions = new java.util.HashSet(List(esq).asJava)
    content.examSections = new java.util.HashSet(List(section).asJava)
    val ee = new ExternalExam
    ee.hash = s"hash-$name"
    ee.externalRef = s"ref-$name"
    ee.creator = student(name)
    ee.created = Instant.now().minusDays(200)
    ee.sent = Instant.now().atZone(ZoneOffset.UTC).minusMonths(monthsAgo).toInstant
    ee.save()
    ee.serialize(content)
    ee

  private def expire(): Unit =
    runIO(app.injector.instanceOf(classOf[ExternalExamExpirationService]).runCheck())

  private def contentOf(ee: ExternalExam) = DB.find(classOf[ExternalExam], ee.id).content.asScala

  "External exam expiration" when:
    "a visit was sent home over four months ago" should:
      "empty it and delete its attachments from XM" in:
        setup()
        val xm = FakeXm(200)
        withXm(xm) {
          val old    = sentVisit("old", 5, Some("att-old"))
          val bare   = sentVisit("bare", 5, None)
          val recent = sentVisit("recent", 1, Some("att-recent"))

          expire()

          contentOf(old) must be(empty)
          contentOf(bare) must be(empty)
          contentOf(recent) must not be empty
          val deleted = xm.requests.asScala.filter(_._1 == "DELETE").map(_._2).toSeq
          deleted must contain("/api/attachments/att-old")
          // Attachments go as soon as the visit is sent; only the content waits
          deleted must contain("/api/attachments/att-recent")
        }
