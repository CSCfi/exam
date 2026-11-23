// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package jobs

import base.BaseIntegrationSpec
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import database.EbeanQueryExtensions
import helpers.InstantArithmetic.*
import io.ebean.DB
import models.assessment.*
import models.enrolment.*
import models.exam.*
import models.facility.ExamMachine
import models.iop.ExternalExam
import models.user.{Language, Role, User}
import org.scalatest.BeforeAndAfterAll
import services.mail.EmailComposer
import system.jobs.*

import java.time.{Duration, Instant}
import scala.jdk.CollectionConverters.*

/** Scheduled jobs keep working through bad rows, and the weekly report finds both the exams a
  * teacher owns and the attempts they inspect.
  */
class ScheduledJobsSpec extends BaseIntegrationSpec with EbeanQueryExtensions
    with BeforeAndAfterAll:

  override protected def sendsMail: Boolean = true

  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  override def beforeEach(): Unit =
    super.beforeEach()
    if !greenMail.isRunning then greenMail.start()
    greenMail.purgeEmailFromAllMailboxes()

  override def afterAll(): Unit =
    try if greenMail.isRunning then greenMail.stop()
    finally super.afterAll()

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  private def user(eppn: String): User =
    val u = new User
    u.eppn = eppn
    u.email = eppn
    u.firstName = "Test"
    u.lastName = eppn.takeWhile(_ != '@')
    u.language = DB.find(classOf[Language]).where().eq("code", "en").find.orNull
    u.save()
    u

  private def teacherRole: Role =
    DB.find(classOf[Role]).where().eq("name", Role.Name.TEACHER.toString).find.get

  private def exam(name: String, state: ExamState, parent: Option[Exam] = None): Exam =
    val e = new Exam
    e.name = name
    e.state = state
    e.duration = 60
    e.executionType = DB.find(classOf[ExamExecutionType]).where()
      .eq("type", ExamExecutionType.Type.PUBLIC.toString).find.get
    e.parent = parent.orNull
    e.generateHash()
    e.save()
    e

  private def participation(copy: Exam, student: User, reservation: Option[Reservation]) =
    val p = new ExamParticipation
    p.exam = copy
    p.user = student
    p.reservation = reservation.orNull
    p.started = Instant.now().minusHours(3)
    p.deadline = Instant.now().plusDays(7)
    p.save()
    p

  private def pastReservation(student: User): Reservation =
    val r = new Reservation
    r.startAt = Instant.now().minusHours(3)
    r.endAt = Instant.now().minusHours(2)
    r.user = student
    r.save()
    r

  "The exam auto saver" should:
    "end overdue exams even when checking another one fails" in:
      setup()
      val student = user("saver-student@test.org")
      // A participation without a start time makes its check throw
      def broken(name: String) =
        val p = participation(
          exam(name, ExamState.STUDENT_STARTED),
          student,
          Some(pastReservation(student))
        )
        p.started = null
        p.update()
        p
      val before  = broken("Broken")
      val overdue = exam("Overdue", ExamState.STUDENT_STARTED)
      // A reservation without a machine used to make the check throw as well
      val ended = participation(overdue, student, Some(pastReservation(student)))
      val after = broken("Broken too")

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      DB.find(classOf[Exam], overdue.id).state mustBe ExamState.REVIEW
      DB.find(classOf[ExamParticipation], ended.id).ended must not be null
      DB.find(classOf[ExamParticipation], before.id).ended mustBe null
      DB.find(classOf[ExamParticipation], after.id).ended mustBe null

    "auto-evaluate the exams it ends" in:
      setup()
      val student = user("auto-eval-student@test.org")
      val overdue = exam("Auto-evaluated", ExamState.STUDENT_STARTED)
      overdue.gradeScale = DB.find(classOf[GradeScale]).list.find(!_.grades.isEmpty).get
      overdue.creator = student
      overdue.examLanguages = new java.util.ArrayList(List(student.language).asJava)
      overdue.update()
      val config = new AutoEvaluationConfig
      config.releaseType = AutoEvaluationReleaseType.IMMEDIATE
      config.gradeEvaluations = new java.util.HashSet()
      overdue.gradeScale.grades.asScala.foreach { grade =>
        val ge = new GradeEvaluation
        ge.grade = grade
        ge.percentage = 0
        config.gradeEvaluations.add(ge)
      }
      config.exam = overdue
      config.save()
      participation(overdue, student, Some(pastReservation(student)))

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      val graded = DB.find(classOf[Exam], overdue.id)
      graded.state mustBe ExamState.GRADED
      graded.grade must not be null
      graded.autoEvaluationNotified must not be null

    "end an attempt taken in an examination event once its time is up" in:
      setup()
      val student = user("event-student@test.org")
      def attemptIn(name: String, startedAgo: Duration) =
        val event = new ExaminationEvent
        event.start = Instant.now().minus(startedAgo)
        event.save()
        val p = participation(exam(name, ExamState.STUDENT_STARTED), student, None)
        p.examinationEvent = event
        p.update()
        p
      val over    = attemptIn("Event over", Duration.ofMinutes(61))
      val ongoing = attemptIn("Event ongoing", Duration.ofMinutes(59))

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      DB.find(classOf[ExamParticipation], over.id).ended must not be null
      DB.find(classOf[Exam], over.exam.id).state mustBe ExamState.REVIEW
      DB.find(classOf[ExamParticipation], ongoing.id).ended mustBe null
      DB.find(classOf[Exam], ongoing.exam.id).state mustBe ExamState.STUDENT_STARTED

    "leave an attempt whose reservation began less than the exam's duration ago" in:
      setup()
      val student = user("ongoing-student@test.org")
      val r       = pastReservation(student)
      r.startAt = Instant.now().minus(Duration.ofMinutes(30))
      r.update()
      val ongoing = participation(exam("Ongoing", ExamState.STUDENT_STARTED), student, Some(r))

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      DB.find(classOf[ExamParticipation], ongoing.id).ended mustBe null

    "tell the owners and inspectors of a private exam that it has ended" in:
      setup()
      val student   = user("private-student@test.org")
      val owner     = user("private-owner@test.org")
      val inspector = user("private-inspector@test.org")
      val parent    = exam("Private", ExamState.PUBLISHED)
      parent.examOwners = Set(owner).asJava
      parent.update()
      val copy = exam("Private", ExamState.STUDENT_STARTED, Some(parent))
      copy.executionType = DB.find(classOf[ExamExecutionType]).where()
        .eq("type", ExamExecutionType.Type.PRIVATE.toString).find.get
      copy.creator = student
      copy.course = DB.find(classOf[Course]).setMaxRows(1).find.get
      copy.update()
      val ei = new ExamInspection
      ei.exam = copy
      ei.user = inspector
      ei.save()
      participation(copy, student, Some(pastReservation(student)))

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      greenMail.waitForIncomingEmail(5000, 2) mustBe true
      greenMail.getReceivedMessages.toList.flatMap(_.getAllRecipients.map(_.toString))
        .toSet mustBe Set(owner.email, inspector.email)

    "end a visiting student's external exam once its time is up" in:
      setup()
      def visit(ref: String, startedAgo: Duration) =
        // A student creates one external exam at most
        val student = user(s"$ref@test.org")
        val r       = new Reservation
        r.startAt = Instant.now().minus(startedAgo)
        r.endAt = r.startAt.plus(Duration.ofMinutes(60))
        r.externalRef = ref
        r.user = student
        r.save()
        val ee = new ExternalExam
        ee.hash = s"hash-$ref"
        ee.externalRef = s"exam-$ref"
        ee.creator = student
        ee.created = r.startAt
        ee.started = r.startAt
        ee.content = Map[String, Object](
          "id"       -> Integer.valueOf(1),
          "name"     -> "Visit",
          "duration" -> Integer.valueOf(60),
          "state"    -> ExamState.STUDENT_STARTED.toString
        ).asJava
        ee.save()
        val enrolment = new ExamEnrolment
        enrolment.user = student
        enrolment.reservation = r
        enrolment.externalExam = ee
        enrolment.save()
        ee
      val over    = visit("visit-over", Duration.ofMinutes(61))
      val ongoing = visit("visit-ongoing", Duration.ofMinutes(59))

      runIO(app.injector.instanceOf(classOf[ExamAutoSaverService]).runCheck())

      val ended = DB.find(classOf[ExternalExam], over.id)
      ended.finished must not be null
      ended.deserialize.state mustBe ExamState.REVIEW
      val still = DB.find(classOf[ExternalExam], ongoing.id)
      still.finished mustBe null
      still.deserialize.state mustBe ExamState.STUDENT_STARTED

  "The weekly report" should:
    "list reviews of exams the teacher owns and of attempts they inspect" in:
      setup()
      val teacher = user("weekly-teacher@test.org")
      val student = user("weekly-student@test.org")

      val owned = exam("Owned exam", ExamState.PUBLISHED)
      owned.examOwners = Set(teacher).asJava
      owned.update()
      participation(exam("Owned copy", ExamState.REVIEW, Some(owned)), student, None)

      val inspected = exam("Inspected exam", ExamState.PUBLISHED)
      val copy      = exam("Inspected copy", ExamState.GRADED, Some(inspected))
      val ei        = new ExamInspection
      ei.exam = copy
      ei.user = teacher
      ei.save()
      participation(copy, student, None)

      app.injector.instanceOf(classOf[EmailComposer]).composeWeeklySummary(teacher)

      greenMail.waitForIncomingEmail(5000L, 1) mustBe true
      val body = greenMail.getReceivedMessages.map(GreenMailUtil.getBody).mkString
      body must include("Owned exam")
      body must include("Inspected exam")

    "reach every teacher, even when one of them cannot be mailed" in:
      setup()
      // No address at all, so composing their mail fails
      val unreachable = user("weekly-unreachable@test.org")
      unreachable.email = null
      unreachable.roles = new java.util.ArrayList(List(teacherRole).asJava)
      unreachable.update()
      val teacher = user("weekly-reached@test.org")
      teacher.roles = new java.util.ArrayList(List(teacherRole).asJava)
      teacher.update()
      val student = user("weekly-reviewed@test.org")
      // Something to report for both, so that both get a mail composed
      Seq(unreachable, teacher).foreach { t =>
        val owned = exam(s"Owned by ${t.lastName}", ExamState.PUBLISHED)
        owned.examOwners = Set(t).asJava
        owned.update()
        participation(exam("Copy", ExamState.REVIEW, Some(owned)), student, None)
      }

      runIO(app.injector.instanceOf(classOf[WeeklyReportService]).runReport())

      greenMail.waitForIncomingEmail(5000L, 1) mustBe true
      greenMail.getReceivedMessagesForDomain("weekly-reached@test.org") must not be empty

  "The auto-evaluation notifier" should:
    "tell the student once the release date has passed, and only then" in:
      setup()
      val student = user("released-student@test.org")
      def graded(name: String, release: AutoEvaluationReleaseType, days: Int): Exam =
        val e = exam(name, ExamState.GRADED, Some(exam(s"$name parent", ExamState.PUBLISHED)))
        e.creator = student
        e.course = DB.find(classOf[Exam], 1L).course
        e.gradedTime = Instant.now().minusDays(10)
        e.grade = DB.find(classOf[Grade]).setMaxRows(1).findOne()
        e.creditType = DB.find(classOf[ExamType]).setMaxRows(1).findOne()
        e.answerLanguage = "en"
        e.update()
        val config = new AutoEvaluationConfig
        config.releaseType = release
        config.amountDays = days
        config.exam = e
        config.save()
        e
      val due      = graded("Due", AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS, 2)
      val notYet   = graded("Not yet", AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS, 30)
      val instant  = graded("Immediate", AutoEvaluationReleaseType.IMMEDIATE, 0)
      val notifier = app.injector.instanceOf(classOf[AutoEvaluationNotifierService])

      runIO(notifier.runCheck())

      greenMail.waitForIncomingEmail(5000L, 1) mustBe true
      greenMail.getReceivedMessages must have size 1
      DB.find(classOf[Exam], due.id).autoEvaluationNotified must not be null
      DB.find(classOf[Exam], notYet.id).autoEvaluationNotified mustBe null
      DB.find(classOf[Exam], instant.id).autoEvaluationNotified mustBe null

      runIO(notifier.runCheck())
      greenMail.getReceivedMessages must have size 1

  "The reservation reminder" should:
    "remind of tomorrow's exams once" in:
      setup()
      val student = user("reminded-student@test.org")
      def booked(hoursAhead: Int): Reservation =
        val r = new Reservation
        r.user = student
        r.machine = DB.find(classOf[ExamMachine]).setMaxRows(1).findOne()
        r.startAt = Instant.now().plusHours(hoursAhead)
        r.endAt = r.startAt.plusHours(1)
        r.save()
        val e = new ExamEnrolment
        e.user = student
        e.exam = DB.find(classOf[Exam], 1L)
        e.reservation = r
        e.enrolledOn = Instant.now()
        e.save()
        r
      val soon     = booked(12)
      val later    = booked(48)
      val reminder = app.injector.instanceOf(classOf[ReservationReminderService])

      runIO(reminder.runCheck())

      greenMail.waitForIncomingEmail(5000L, 1) mustBe true
      greenMail.getReceivedMessages must have size 1
      DB.find(classOf[Reservation], soon.id).reminderSent mustBe true
      DB.find(classOf[Reservation], later.id).reminderSent mustBe false

      runIO(reminder.runCheck())
      greenMail.getReceivedMessages must have size 1

  "The exam expiration" should:
    "delete attempts and their records once the expiration period has passed" in:
      setup()
      val student = user("expired-student@test.org")
      def finished(name: String, state: ExamState, monthsAgo: Long): Exam =
        val e = exam(name, state, Some(exam(s"$name parent", ExamState.PUBLISHED)))
        e.creator = student
        e.gradedTime = Instant.now().atZone(java.time.ZoneOffset.UTC).minusMonths(monthsAgo)
          .toInstant
        e.update()
        val record = new ExamRecord
        record.exam = e
        record.student = student
        record.save()
        e
      val old              = finished("Old", ExamState.GRADED_LOGGED, 7)
      val recent           = finished("Recent", ExamState.GRADED_LOGGED, 2)
      val active           = finished("Still graded", ExamState.GRADED, 7)
      def records(e: Exam) = DB.find(classOf[ExamRecord]).where().eq("exam.id", e.id).list

      runIO(app.injector.instanceOf(classOf[ExamExpirationService]).runCheck())

      val expired = DB.find(classOf[Exam], old.id)
      expired.state mustBe ExamState.DELETED
      expired.creator mustBe null
      records(old) mustBe empty
      DB.find(classOf[Exam], recent.id).state mustBe ExamState.GRADED_LOGGED
      records(recent) must have size 1
      DB.find(classOf[Exam], active.id).state mustBe ExamState.GRADED
