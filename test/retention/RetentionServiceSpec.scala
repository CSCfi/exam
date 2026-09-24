// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import features.retention.services.*
import io.ebean.DB
import models.assessment.{ExamRecord, ExamScore}
import models.attachment.Attachment
import models.enrolment.*
import models.exam.{Exam, ExamExecutionType, ExamState}
import models.questions.{EssayAnswer, Question}
import models.user.{Role, User}
import org.joda.time.{DateTime, Period}
import services.datetime.FixedAppClock
import services.enrolment.EnrolmentHandler
import services.file.FileHandler

import java.nio.file.Files
import scala.jdk.CollectionConverters.*

class RetentionServiceSpec extends RetentionSpecBase:

  // Tests ----------------------------------------------------------------------------------------

  "RetentionService" when:
    "an assessed attempt is past its period" should:
      "delete its content and keep the booking and the grading record" in:
        setup()
        val a               = attempt(newUser("anna", t0, Role.Name.STUDENT))
        val sourceSections  = sectionCount(a.copy.parent.id)
        val copiedQuestions = questionsOf(a.copy.id)
        val originals       = copiedQuestions.map(q => DB.find(classOf[Question], q).parent.id)
        val originalOwners  = originals.map(q => DB.find(classOf[Question], q).questionOwners.size)
        copiedQuestions must not be empty

        val report = run(t0.plusMonths(7))

        pass(report, RetentionPass.AttemptContent).applied must be >= 1
        val copy = DB.find(classOf[Exam], a.copy.id)
        copy.state mustBe ExamState.DELETED
        Option(copy.creator) mustBe None
        Option(copy.attachment) mustBe None
        sectionCount(a.copy.id) mustBe 0
        DB.find(classOf[EssayAnswer]).where().eq("answer", "My answer").findCount() mustBe 0
        Files.exists(a.answerFile) mustBe false
        // The teacher's exam still refers to the shared file
        Files.exists(a.sharedFile) mustBe true
        sectionCount(a.copy.parent.id) mustBe sourceSections
        copiedQuestions.filter(exists(classOf[Question], _)) mustBe empty
        originals.map(q => DB.find(classOf[Question], q).questionOwners.size) mustBe originalOwners
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe true
        exists(classOf[Reservation], a.reservation.id) mustBe true
        exists(classOf[ExamParticipation], a.participation.id) mustBe true
        DB.find(classOf[ExamRecord], a.record.id).exam.id mustBe a.copy.id
        exists(classOf[User], a.student.id) mustBe true

      "keep attempts limits working as they do today" in:
        setup()
        val a       = attempt(newUser("aino", t0, Role.Name.STUDENT))
        val handler = app.injector.instanceOf(classOf[EnrolmentHandler])
        val parent  = DB.find(classOf[Exam], a.copy.parent.id)
        parent.trialCount = 1
        parent.update()
        val before = handler.isAllowedToParticipate(parent, a.student)
        run(t0.plusMonths(7))
        handler.isAllowedToParticipate(parent, a.student) mustBe before

    "an attempt is still within its period" should:
      "leave it untouched" in:
        setup()
        val a = attempt(newUser("antti", t0, Role.Name.STUDENT))

        val report = run(t0.plusMonths(5))

        DB.find(classOf[Exam], a.copy.id).state mustBe ExamState.GRADED_LOGGED
        sectionCount(a.copy.id) must be > 0
        Files.exists(a.answerFile) mustBe true

    "an attempt was never assessed" should:
      "archive it a year after the exam and keep its content" in:
        setup()
        val a =
          attempt(newUser("arto", t0, Role.Name.STUDENT), state = ExamState.REVIEW, lockedAt = None)
        val now = t0.plusYears(1).plusDays(1)

        val report = run(now)

        pass(report, RetentionPass.AutoLock).applied must be >= 1
        val copy = DB.find(classOf[Exam], a.copy.id)
        copy.state mustBe ExamState.ARCHIVED
        copy.lockedAt mustBe now
        sectionCount(a.copy.id) must be > 0

    "a grading record is past two years" should:
      "delete the record and its score" in:
        setup()
        val a     = attempt(newUser("aleksi", t0, Role.Name.STUDENT))
        val score = a.record.examScore.id

        run(t0.plusYears(2).plusDays(1))

        exists(classOf[ExamRecord], a.record.id) mustBe false
        exists(classOf[ExamScore], score) mustBe false

    "a student has been inactive for years" should:
      "remove everything in one run and leave the teacher's data alone" in:
        setup()
        val other        = newUser("bertta", t0.plusYears(3), Role.Name.STUDENT)
        val a            = attempt(newUser("bruno", t0, Role.Name.STUDENT))
        val parentId     = a.copy.parent.id
        val sections     = sectionCount(parentId)
        val studentUsers = DB.find(classOf[User]).where().eq("roles.name", "STUDENT").findCount()

        val report = run(t0.plusYears(3))

        exists(classOf[Exam], a.copy.id) mustBe false
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe false
        exists(classOf[ExamParticipation], a.participation.id) mustBe false
        exists(classOf[Reservation], a.reservation.id) mustBe false
        exists(classOf[ExamRecord], a.record.id) mustBe false
        exists(classOf[User], a.student.id) mustBe false
        Files.exists(a.answerFile) mustBe false
        // Teacher's exam and other accounts are unaffected
        exists(classOf[Exam], parentId) mustBe true
        sectionCount(parentId) mustBe sections
        Files.exists(a.sharedFile) mustBe true
        exists(classOf[Role], role(Role.Name.STUDENT).id) mustBe true
        DB.find(classOf[User], other.id).roles.asScala.map(_.name) mustBe List("STUDENT")
        DB.find(classOf[User]).where().eq("roles.name", "STUDENT").findCount() mustBe
          studentUsers - 1

      "find nothing to do on the next run" in:
        setup()
        attempt(newUser("bea", t0, Role.Name.STUDENT))
        run(t0.plusYears(3))
        run(t0.plusYears(3)).passes.map(_.applied).sum mustBe 0

      "keep the account of a user with other roles" in:
        setup()
        val a = attempt(newUser("carl", t0, Role.Name.STUDENT, Role.Name.TEACHER))

        run(t0.plusYears(3))

        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe false
        exists(classOf[User], a.student.id) mustBe true

    "running in dry-run mode" should:
      "report what is due and change nothing" in:
        setup()
        val a = attempt(newUser("dora", t0, Role.Name.STUDENT))

        val report = runIO(service(t0.plusYears(3)).run(dryRun = true))

        report.dryRun mustBe true
        pass(report, RetentionPass.AttemptContent).due must be >= 1
        pass(report, RetentionPass.Records).due must be >= 1
        report.passes.map(_.applied).sum mustBe 0
        DB.find(classOf[Exam], a.copy.id).state mustBe ExamState.GRADED_LOGGED
        sectionCount(a.copy.id) must be > 0
        exists(classOf[ExamRecord], a.record.id) mustBe true
        exists(classOf[User], a.student.id) mustBe true

    "more items are due than the batch size" should:
      "handle only a batch per run" in:
        setup()
        attempt(newUser("eero", t0, Role.Name.STUDENT))
        attempt(newUser("elsa", t0, Role.Name.STUDENT))

        val small  = policy.copy(batchSize = 1)
        val report = run(t0.plusMonths(7), small)

        val first = pass(report, RetentionPass.AttemptContent)
        first.due mustBe 1
        first.applied mustBe 1
        first.more mustBe true

        // The next run picks up where this one left off
        pass(run(t0.plusMonths(7), small), RetentionPass.AttemptContent).applied mustBe 1

    "a visiting reservation is due" should:
      "delete it at XM before deleting it locally" in:
        setup()
        val iop = FakeIop()
        val a   = attempt(newUser("fanni", t0, Role.Name.STUDENT), externalRef = Some("xm-doc-1"))

        run(t0.plusYears(3), iop = iop)

        iop.calls.get mustBe 1
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe false
        exists(classOf[User], a.student.id) mustBe false

      "keep the booking and the account when XM fails" in:
        setup()
        val iop = FakeIop(fail = true)
        val a   = attempt(newUser("frans", t0, Role.Name.STUDENT), externalRef = Some("xm-doc-2"))

        // The booking became due two years after the reservation
        val report = run(t0.plusYears(2).plusDays(5), iop = iop)

        pass(report, RetentionPass.Bookings).failed mustBe 1
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe true
        DB.find(classOf[Reservation], a.reservation.id).externalRef mustBe "xm-doc-2"
        exists(classOf[User], a.student.id) mustBe true

      "delete the booking without XM when XM still fails 30 days after it became due" in:
        setup()
        val iop = FakeIop(fail = true)
        val a   = attempt(newUser("frida", t0, Role.Name.STUDENT), externalRef = Some("xm-doc-3"))

        val report = run(t0.plusYears(2).plusDays(30), iop = iop)

        iop.calls.get mustBe 1
        pass(report, RetentionPass.Bookings).failed mustBe 0
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe false
        exists(classOf[User], a.student.id) mustBe false

    "a host-side visitor reservation is past two years" should:
      "delete it" in:
        setup()
        val visitor = new Reservation
        visitor.startAt = t0
        visitor.endAt = t0.plusHours(2)
        visitor.externalUserRef = "visitor@other.fi"
        visitor.save()
        val recent = new Reservation
        recent.startAt = t0.plusYears(2)
        recent.endAt = t0.plusYears(2).plusHours(2)
        recent.externalUserRef = "visitor@other.fi"
        recent.save()

        run(t0.plusYears(2).plusDays(1))

        exists(classOf[Reservation], visitor.id) mustBe false
        exists(classOf[Reservation], recent.id) mustBe true

    "a maturity attempt is locked" should:
      "keep its content for the maturity period" in:
        setup()
        val a    = attempt(newUser("maija", t0, Role.Name.STUDENT))
        val copy = DB.find(classOf[Exam], a.copy.id)
        copy.executionType = DB.find(classOf[ExamExecutionType]).where().eq("type", "MATURITY").find
          .getOrElse(fail("No maturity execution type"))
        copy.update()
        val longer = policy.copy(maturityAttempt = Period.years(2))

        run(t0.plusMonths(7), longer)
        sectionCount(a.copy.id) must be > 0

        run(t0.plusYears(2).plusDays(1), longer)
        sectionCount(a.copy.id) mustBe 0

    "the course of an attempt is still running" should:
      "keep the attempt until the course ends" in:
        setup()
        val a      = attempt(newUser("kalle", t0, Role.Name.STUDENT))
        val course = DB.find(classOf[Exam], a.copy.id).course
        course.endDate = t0.plusMonths(10).toDate
        course.update()

        run(t0.plusMonths(7))
        sectionCount(a.copy.id) must be > 0

        run(t0.plusMonths(10).plusDays(1))
        sectionCount(a.copy.id) mustBe 0

      "fall back to the end of the exam's enrolment period without a course end" in:
        setup()
        val a      = attempt(newUser("kerttu", t0, Role.Name.STUDENT))
        val course = DB.find(classOf[Exam], a.copy.id).course
        course.endDate = null
        course.update()
        // Read from the teacher's exam, which a teacher may extend after the copy was made
        val parent = DB.find(classOf[Exam], a.copy.parent.id)
        parent.periodEnd = t0.plusMonths(9)
        parent.update()

        run(t0.plusMonths(7))
        sectionCount(a.copy.id) must be > 0

        run(t0.plusMonths(9).plusDays(1))
        sectionCount(a.copy.id) mustBe 0

    "an attempt was aborted" should:
      "keep it for a year from the end of the exam" in:
        setup()
        val a = attempt(
          newUser("olli", t0, Role.Name.STUDENT),
          state = ExamState.ABORTED,
          lockedAt = None
        )

        run(t0.plusMonths(11))
        sectionCount(a.copy.id) must be > 0

        run(t0.plusYears(1).plusDays(1))
        sectionCount(a.copy.id) mustBe 0
        DB.find(classOf[Exam], a.copy.id).state mustBe ExamState.DELETED

    "the old expiration job already marked a copy deleted" should:
      "remove the content it left behind" in:
        setup()
        val a = attempt(
          newUser("veera", t0, Role.Name.STUDENT),
          state = ExamState.DELETED,
          lockedAt = None
        )

        run(t0.plusMonths(5))
        sectionCount(a.copy.id) must be > 0

        run(t0.plusMonths(7))
        sectionCount(a.copy.id) mustBe 0
        Files.exists(a.answerFile) mustBe false
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe true

    "an exam copy was created but never started" should:
      "go with its booking, together with its question copies" in:
        setup()
        val a = attempt(
          newUser("iida", t0, Role.Name.STUDENT),
          state = ExamState.INITIALIZED,
          lockedAt = None,
          started = false
        )
        val copiedQuestions = questionsOf(a.copy.id)
        copiedQuestions must not be empty

        run(t0.plusYears(1))
        exists(classOf[Exam], a.copy.id) mustBe true

        run(t0.plusYears(3))
        exists(classOf[Exam], a.copy.id) mustBe false
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe false
        copiedQuestions.filter(exists(classOf[Question], _)) mustBe empty
        Files.exists(a.answerFile) mustBe false
        exists(classOf[User], a.student.id) mustBe false

    "a host-side visitor reservation still has an enrolment" should:
      "leave both alone" in:
        setup()
        val reservation = new Reservation
        reservation.startAt = t0
        reservation.endAt = t0.plusHours(2)
        reservation.externalUserRef = "visitor@other.fi"
        reservation.save()
        val enrolment = new ExamEnrolment
        enrolment.preEnrolledUserEmail = "visitor@other.fi"
        enrolment.exam = prototype()
        enrolment.reservation = reservation
        enrolment.enrolledOn = t0.minusDays(10)
        enrolment.save()

        run(t0.plusYears(3))

        exists(classOf[Reservation], reservation.id) mustBe true
        exists(classOf[ExamEnrolment], enrolment.id) mustBe true

    "candidates span several pages" should:
      "find all of them in a dry run and stop at the batch in a real run" in:
        setup()
        // exam_record.student is unique, so each record gets its own student
        val students = (1 to 5).map(i => newUser(s"sivu$i", t0.plusYears(3), Role.Name.STUDENT))
        students.foreach { student =>
          val visitor = new Reservation
          visitor.startAt = t0
          visitor.endAt = t0.plusHours(2)
          visitor.externalUserRef = "visitor@other.fi"
          visitor.save()
          val score = new ExamScore
          score.student = student.eppn
          score.save()
          val record = new ExamRecord
          record.student = student
          record.examScore = score
          record.timeStamp = t0
          record.save()
        }
        // Two rows per page, so five candidates of each kind span three pages
        val repository = new RetentionRepository(app.injector.instanceOf(classOf[FileHandler])):
          override protected def pageSize: Int = 2
        def service(p: RetentionPolicy) =
          RetentionService(p, repository, FakeIop(), FixedAppClock(t0.plusYears(3)))
        def hostReservations = DB.find(classOf[Reservation]).where()
          .eq("externalUserRef", "visitor@other.fi").findCount()

        val dry = runIO(service(policy).run(dryRun = true))
        pass(dry, RetentionPass.HostReservations).due mustBe 5
        pass(dry, RetentionPass.Records).due must be >= 5

        val batch = runIO(service(policy.copy(batchSize = 3)).run(dryRun = false))
        pass(batch, RetentionPass.HostReservations).due mustBe 3
        pass(batch, RetentionPass.HostReservations).more mustBe true
        hostReservations mustBe 2

        runIO(service(policy.copy(batchSize = 3)).run(dryRun = false))
        hostReservations mustBe 0
        DB.find(classOf[ExamRecord]).where().in("student.id", students.map(_.id).asJava)
          .findCount() mustBe 0
