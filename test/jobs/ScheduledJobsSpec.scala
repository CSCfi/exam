// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
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
import models.enrolment.{ExamParticipation, Reservation}
import models.exam.*
import models.user.{Language, User}
import org.scalatest.BeforeAndAfterAll
import services.mail.EmailComposer
import system.jobs.ExamAutoSaverService

import java.time.Instant
import scala.jdk.CollectionConverters.*

/** Scheduled jobs keep working through bad rows, and the weekly report finds both the exams a
  * teacher owns and the attempts they inspect.
  */
class ScheduledJobsSpec extends BaseIntegrationSpec with EbeanQueryExtensions
    with BeforeAndAfterAll:

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
