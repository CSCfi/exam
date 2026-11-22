// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package mail

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{Comment, LanguageInspection}
import models.enrolment.*
import models.exam.*
import models.iop.CollaborativeExam
import models.user.{Language, User}
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import services.config.{ByodConfigHandler, ConfigReader}
import services.mail.*

import java.time.Instant
import java.time.temporal.ChronoUnit.DAYS
import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** The mails the composer builds, as handed to the sender */
class EmailComposerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  /** Keeps what would have been sent */
  private class Outbox extends EmailSender:
    val sent                                = new ConcurrentLinkedQueue[Dispatch]()
    override def send(mail: Dispatch): Unit = sent.add(mail)
    def all: List[Dispatch]                 = sent.asScala.toList
    def only: Dispatch =
      all must have size 1
      all.head

  private val outbox = new Outbox

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.overrides(bind[EmailSender].toInstance(outbox))

  override def beforeEach(): Unit =
    super.beforeEach()
    outbox.sent.clear()

  private def composer = app.injector.instanceOf(classOf[EmailComposer])

  private def user(name: String): User =
    val u = new User
    u.eppn = s"$name@mail.test"
    u.email = u.eppn
    u.firstName = name.capitalize
    u.lastName = "Tester"
    u.language = DB.find(classOf[Language], "en")
    u.save()
    u

  /** Exam 1, owned by a teacher who reads English */
  private def exam(owner: User): Exam =
    ensureTestDataLoaded()
    val e = DB.find(classOf[Exam], 1L)
    e.examOwners = new java.util.HashSet(List(owner).asJava)
    e.update()
    e

  private def recipient(d: Dispatch): Set[String] = d match
    case m: Mail      => Set(m.recipient)
    case b: Broadcast => b.recipients

  // Examination events ------------------------------------------------------------------------

  private def event(e: Exam, start: Instant): ExaminationEventConfiguration =
    val byod  = app.injector.instanceOf(classOf[ByodConfigHandler])
    val event = new ExaminationEvent
    event.start = start
    event.description = "Bring your own laptop"
    event.save()
    val config = new ExaminationEventConfiguration
    config.exam = e
    config.examinationEvent = event
    config.hash = "event-hash"
    config.settingsPasswordSalt = "settings-salt"
    config.quitPasswordSalt = "quit-salt"
    config.encryptedSettingsPassword = byod.getEncryptedPassword("settings-pw", "settings-salt")
    config.encryptedQuitPassword = byod.getEncryptedPassword("quit-pw", "quit-salt")
    config.save()
    config

  private def enrolment(student: User, e: Exam, config: ExaminationEventConfiguration) =
    val en = new ExamEnrolment
    en.user = student
    en.exam = e
    en.examinationEventConfiguration = config
    en.enrolledOn = Instant.now()
    en.save()
    en

  "Examination event mails" when:
    "a student registers for a SEB exam" should:
      "confirm it and attach the exam's start file" in:
        val student = user("seb")
        val e       = exam(user("owner"))
        e.implementation = ExamImplementation.CLIENT_AUTH
        e.update()
        val en = enrolment(student, e, event(e, Instant.now().plus(3, DAYS)))

        composer.composeExaminationEventNotification(student, en, false)
        val mail = outbox.only
        recipient(mail) must be(Set(student.email))
        mail.subject must startWith("Registration for an exam event")
        mail.subject must include(e.name)
        mail.content must include("Bring your own laptop")
        mail.content must include("Owner Tester")
        mail.content must include("Attached is a file")
        mail.attachments.map(_.getName) must be(Set(s"${e.name.replace(" ", "-")}.seb"))

        outbox.sent.clear()
        composer.composeExaminationEventNotification(student, en, true)
        outbox.only.subject must startWith("Reminder of an upcoming exam")

    "the exam needs no start file" should:
      "confirm it without one" in:
        val student = user("home")
        val e       = exam(user("owner"))
        e.implementation = ExamImplementation.WHATEVER
        e.update()
        val en = enrolment(student, e, event(e, Instant.now().plus(3, DAYS)))

        composer.composeExaminationEventNotification(student, en, false)
        outbox.only.attachments must be(empty)
        outbox.only.content must not include "Attached is a file"

    "an event is cancelled" should:
      "tell an administrator's cancellation from the student's own" in:
        val (a, b) = (user("first"), user("second"))
        val e      = exam(user("owner"))
        val config = event(e, Instant.now().plus(3, DAYS))

        composer.composeExaminationEventCancellationNotification(
          Set(a, b),
          e,
          config.examinationEvent
        )
        outbox.all.flatMap(recipient).toSet must be(Set(a.email, b.email))
        outbox.all.foreach(_.content must include("has been cancelled"))

        outbox.sent.clear()
        composer.composeExaminationEventCancellationNotification(a, e, config.examinationEvent)
        outbox.only.content must include("You have cancelled your registration")
        outbox.only.content must include("Bring your own laptop")

  // Reviews -----------------------------------------------------------------------------------

  "Review mails" when:
    "a teacher asks a colleague to review" should:
      "list the students waiting for review" in:
        val (from, to) = (user("asker"), user("reviewer"))
        val e          = exam(from)
        Seq("Anna", "Bert").foreach { name =>
          val copy = new Exam
          copy.name = e.name
          copy.parent = e
          copy.state = ExamState.REVIEW
          copy.creator = user(name.toLowerCase)
          copy.save()
        }

        composer.composeExamReviewRequest(to, from, e, "Please have a look")
        val mail = outbox.only
        recipient(mail) must be(Set(to.email))
        mail.sender must be(from.email)
        mail.content must include("Please have a look")
        mail.content must include("<ul><li>Anna Tester</li><li>Bert Tester</li></ul>")
        mail.content must not include "</ul>)"

      "leave the list out when nobody is waiting" in:
        val (from, to) = (user("asker"), user("reviewer"))
        composer.composeExamReviewRequest(to, from, exam(from), "Nothing yet")
        outbox.only.content must not include "{{student_list}}"
        outbox.only.content must not include "<ul>"

    "a reviewer comments on an attempt" should:
      "link to the attempt, local or collaborative" in:
        val (reviewer, owner) = (user("reviewer"), user("owner"))
        val e                 = exam(owner)

        composer.composeInspectionMessage(owner, reviewer, e, "Looks fine")
        outbox.only.content must include(s"/staff/assessments/${e.id}\"")
        outbox.only.content must include("Looks fine")
        outbox.only.content must include(e.course.name)

        outbox.sent.clear()
        val ce = new CollaborativeExam
        ce.externalRef = "collab-ref"
        ce.revision = "rev-3"
        ce.save()
        composer.composeInspectionMessage(owner, reviewer, ce, e, "Shared one")
        val host = app.injector.instanceOf(classOf[ConfigReader]).getHostName
        val link = s"$host/staff/assessments/${ce.id}/collaborative/rev-3"
        outbox.only.content must include(s"\"$link\"")

    "a language inspection is finished" should:
      "give the verdict and the statement" in:
        val (inspector, teacher, student) = (user("inspector"), user("teacher"), user("student"))
        val e                             = exam(teacher)
        e.creator = student
        val statement = new Comment
        statement.comment = "Clear and correct Finnish"
        val inspection = new LanguageInspection
        inspection.exam = e
        inspection.approved = true
        inspection.statement = statement

        composer.composeLanguageInspectionFinishedMessage(teacher, inspector, inspection)
        val mail = outbox.only
        recipient(mail) must be(Set(teacher.email))
        mail.sender must be(inspector.email)
        mail.content must include("Accepted")
        mail.content must include("Clear and correct Finnish")
        mail.content must include("Student Tester")

  // Exam announcements ------------------------------------------------------------------------

  "Announcements" when:
    "a collaborative exam is published" should:
      "go to all the given addresses, copied to the sender" in:
        val sender = user("organiser")
        val e      = exam(sender)
        e.periodStart = Instant.parse("2026-12-01T00:00:00Z")
        e.periodEnd = Instant.parse("2026-12-31T21:59:00Z")

        composer.composeCollaborativeExamAnnouncement(Set("a@x.fi", "b@y.fi"), sender, e)
        val mail = outbox.only
        recipient(mail) must be(Set("a@x.fi", "b@y.fi"))
        mail.cc must be(Set(sender.email))
        mail.content must include("01.12.2026 - 31.12.2026")
        mail.content must not include "%01.12.2026"

    "a student is added to a private exam" should:
      "tell them when to book, or when the events are" in:
        val (teacher, student) = (user("teacher"), user("student"))
        val e                  = exam(teacher)
        e.implementation = ExamImplementation.AQUARIUM

        composer.composePrivateExamParticipantNotification(student, teacher, e)
        outbox.only.subject must startWith("A personal exam has been created to you")
        outbox.only.content must include(s"/calendar/${e.id}")

        outbox.sent.clear()
        e.implementation = ExamImplementation.CLIENT_AUTH
        e.update()
        event(e, Instant.parse("2030-06-12T07:00:00Z"))
        val withEvents = DB.find(classOf[Exam], e.id)
        composer.composePrivateExamParticipantNotification(student, teacher, withEvents)
        outbox.only.content must include("You have to book the exam")
        // Events are given on the organisation's clock
        outbox.only.content must include("12.06.2030 10:00")

      "call a maturity test by its name" in:
        val (teacher, student) = (user("teacher"), user("student"))
        val e                  = exam(teacher)
        e.executionType = DB.find(classOf[ExamExecutionType]).where()
          .eq("type", ExamExecutionType.Type.MATURITY.toString).find.get

        composer.composePrivateExamParticipantNotification(student, teacher, e)
        outbox.only.subject must startWith("A maturity test has been created for you")

  "The weekly summary" when:
    "a review deadline falls early in the morning" should:
      "give it as the organisation's day, not UTC's" in:
        val teacher = user("weekly")
        val e       = exam(teacher)
        val copy    = new Exam
        copy.name = e.name
        copy.parent = e
        copy.state = ExamState.REVIEW
        copy.creator = user("waiting")
        copy.save()
        val p = new ExamParticipation
        p.exam = copy
        p.user = copy.creator
        // 01:30 on 2 December in Finland, still 1 December in UTC
        p.deadline = Instant.parse("2026-12-01T23:30:00Z")
        p.save()

        composer.composeWeeklySummary(teacher)
        outbox.only.content must include("1 exams (assessment deadline 02.12.2026)")
