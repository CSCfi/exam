// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import base.BaseIntegrationSpec
import cats.effect.IO
import database.EbeanQueryExtensions
import features.exam.copy.ExamCopyContext
import features.retention.services.*
import io.ebean.DB
import models.assessment.{ExamRecord, ExamScore}
import models.attachment.Attachment
import models.enrolment.*
import models.exam.{Exam, ExamState}
import models.questions.{EssayAnswer, Question}
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Language, Role, User}
import org.joda.time.{DateTime, DateTimeZone, Period}
import services.datetime.FixedAppClock
import services.enrolment.EnrolmentHandler

import java.nio.file.{Files, Path}
import java.util.concurrent.atomic.AtomicInteger
import scala.jdk.CollectionConverters.*

class RetentionServiceSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

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

  /** Records XM calls and fails them on request. */
  private class FakeIop(fail: Boolean = false) extends IopRetentionClient:
    val calls                                          = new AtomicInteger(0)
    def deleteAttachment(externalId: String): IO[Unit] = IO.unit
    def deleteReservation(reservation: Reservation): IO[Unit] =
      IO(calls.incrementAndGet()) *>
        (if fail then IO.raiseError(new RuntimeException("XM unavailable")) else IO.unit)

  private def service(
      now: DateTime,
      p: RetentionPolicy = policy,
      iop: IopRetentionClient = FakeIop()
  ) =
    RetentionService(
      p,
      app.injector.instanceOf(classOf[RetentionRepository]),
      iop,
      FixedAppClock(now)
    )

  private def run(now: DateTime, p: RetentionPolicy = policy, iop: IopRetentionClient = FakeIop()) =
    runIO(service(now, p, iop).run())

  // Fixture ------------------------------------------------------------------------------------

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  private def role(name: Role.Name): Role =
    DB.find(classOf[Role]).where().eq("name", name.toString).find.getOrElse(fail(s"No role $name"))

  private def newUser(name: String, lastLogin: DateTime, roles: Role.Name*): User =
    val user = new User
    user.email = s"$name@retention.test"
    user.eppn = s"$name@retention.test"
    user.firstName = name
    user.lastName = "Student"
    user.language = DB.find(classOf[Language]).where().eq("code", "fi").find.orNull
    user.roles = roles.map(role).toList.asJava
    user.lastLogin = lastLogin.toDate
    user.save()
    user

  private def prototype(): Exam =
    DB.find(classOf[Exam])
      .where()
      .eq("name", "Johdatus alkeiden perusteisiin")
      .eq("state", ExamState.PUBLISHED)
      .find
      .getOrElse(fail("Source exam not found in test data"))

  private def tempFile(name: String): Path =
    val f = Files.createTempFile(s"retention-$name", ".txt")
    Files.writeString(f, name)
    f

  private def attachment(path: Path): Attachment =
    val a = new Attachment
    a.fileName = path.getFileName.toString
    a.filePath = path.toString
    a.mimeType = "text/plain"
    a.save()
    a

  /** Everything retention touches for one exam attempt. */
  private case class Attempt(
      student: User,
      copy: Exam,
      enrolment: ExamEnrolment,
      participation: ExamParticipation,
      reservation: Reservation,
      record: ExamRecord,
      answerFile: Path,
      sharedFile: Path
  )

  /** A student who sat the prototype exam at `at`, with an essay answer carrying a file, a copy of
    * the teacher's exam attachment and a grading record.
    */
  private def attempt(
      student: User,
      at: DateTime = t0,
      state: ExamState = ExamState.GRADED_LOGGED,
      lockedAt: Option[DateTime] = Some(t0),
      externalRef: Option[String] = None
  ): Attempt =
    val source = prototype()
    for
      section <- source.examSections.asScala
      esq     <- section.sectionQuestions.asScala
      opt     <- esq.question.options.asScala
    do
      val esqo = new ExamSectionQuestionOption
      esqo.option = opt
      esqo.examSectionQuestion = esq
      esqo.save()
    val sharedFile = tempFile("shared")
    source.attachment = attachment(sharedFile)
    source.update()

    val fresh = DB.find(classOf[Exam], source.id)
    val copy  = fresh.createCopy(ExamCopyContext.forStudentExam(student).build())
    copy.state = state
    copy.creator = student
    copy.parent = fresh
    copy.lockedAt = lockedAt.orNull
    copy.gradedTime = lockedAt.orNull
    copy.generateHash()
    copy.save()

    val answerFile = tempFile("answer")
    val esq = DB.find(classOf[ExamSectionQuestion]).where().eq("examSection.exam.id", copy.id)
      .setMaxRows(1).find.getOrElse(fail("Copy has no questions"))
    val answer = new EssayAnswer
    answer.answer = "My answer"
    answer.attachment = attachment(answerFile)
    answer.save()
    esq.essayAnswer = answer
    esq.update()

    val reservation = new Reservation
    reservation.startAt = at
    reservation.endAt = at.plusHours(2)
    reservation.user = student
    reservation.externalRef = externalRef.orNull
    externalRef.foreach { _ =>
      val external = new ExternalReservation
      external.orgRef = "host-org"
      external.roomRef = "host-room"
      external.save()
      reservation.externalReservation = external
    }
    reservation.save()

    val enrolment = new ExamEnrolment
    enrolment.user = student
    enrolment.exam = copy
    enrolment.reservation = reservation
    enrolment.enrolledOn = at.minusDays(10)
    enrolment.save()

    val participation = new ExamParticipation
    participation.user = student
    participation.exam = copy
    participation.reservation = reservation
    participation.started = at
    participation.ended = at.plusHours(2)
    participation.save()

    val score = new ExamScore
    score.student = student.eppn
    score.save()
    val record = new ExamRecord
    record.exam = copy
    record.student = student
    record.examScore = score
    record.timeStamp = lockedAt.getOrElse(at)
    record.save()

    Attempt(student, copy, enrolment, participation, reservation, record, answerFile, sharedFile)

  private def exists[T](cls: Class[T], id: Long): Boolean = Option(DB.find(cls, id)).isDefined

  private def sectionCount(examId: Long): Int =
    DB.find(classOf[ExamSection]).where().eq("exam.id", examId).findCount()

  private def questionsOf(examId: Long): List[Long] =
    DB.find(classOf[ExamSectionQuestion]).where().eq("examSection.exam.id", examId).list
      .map(_.question.id.longValue)
      .distinct

  private def pass(report: RetentionReport, prefix: String): PassResult =
    report.passes.find(_.name.startsWith(prefix)).getOrElse(fail(s"No pass $prefix"))

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

        pass(report, "B").applied must be >= 1
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

        pass(report, "A").applied must be >= 1
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
        pass(report, "B").due must be >= 1
        pass(report, "C").due must be >= 1
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

        val report = run(t0.plusMonths(7), policy.copy(batchSize = 1))

        pass(report, "B").due must be >= 2
        pass(report, "B").applied mustBe 1

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

        val report = run(t0.plusYears(3), iop = iop)

        pass(report, "D bookings").failed mustBe 1
        exists(classOf[ExamEnrolment], a.enrolment.id) mustBe true
        DB.find(classOf[Reservation], a.reservation.id).externalRef mustBe "xm-doc-2"
        exists(classOf[User], a.student.id) mustBe true

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
