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
import models.questions.EssayAnswer
import models.sections.{ExamSection, ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Language, Role, User}
import org.joda.time.{DateTime, DateTimeZone, Period}
import services.datetime.FixedAppClock

import java.nio.file.{Files, Path}
import java.util.concurrent.atomic.AtomicInteger
import scala.jdk.CollectionConverters.*

/** Test data and helpers shared by the retention specs that run against the database. */
abstract class RetentionSpecBase extends BaseIntegrationSpec with EbeanQueryExtensions:

  protected val t0 = new DateTime(2023, 3, 1, 10, 0, DateTimeZone.UTC)

  protected val policy = RetentionPolicy(
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
  protected class FakeIop(fail: Boolean = false) extends IopRetentionClient:
    val calls                                          = new AtomicInteger(0)
    def deleteAttachment(externalId: String): IO[Unit] = IO.unit
    def deleteReservation(reservation: Reservation): IO[Unit] =
      IO(calls.incrementAndGet()) *>
        (if fail then IO.raiseError(new RuntimeException("XM unavailable")) else IO.unit)

  protected def service(
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

  protected def run(
      now: DateTime,
      p: RetentionPolicy = policy,
      iop: IopRetentionClient = FakeIop()
  ) =
    runIO(service(now, p, iop).run())

  // Fixture ------------------------------------------------------------------------------------

  protected def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  protected def role(name: Role.Name): Role =
    DB.find(classOf[Role]).where().eq("name", name.toString).find.getOrElse(fail(s"No role $name"))

  protected def newUser(name: String, lastLogin: DateTime, roles: Role.Name*): User =
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

  protected def prototype(): Exam =
    DB.find(classOf[Exam])
      .where()
      .eq("name", "Johdatus alkeiden perusteisiin")
      .eq("state", ExamState.PUBLISHED)
      .find
      .getOrElse(fail("Source exam not found in test data"))

  protected def tempFile(name: String): Path =
    val f = Files.createTempFile(s"retention-$name", ".txt")
    Files.writeString(f, name)
    f

  protected def attachment(path: Path): Attachment =
    val a = new Attachment
    a.fileName = path.getFileName.toString
    a.filePath = path.toString
    a.mimeType = "text/plain"
    a.save()
    a

  /** Everything retention touches for one exam attempt. */
  protected case class Attempt(
      student: User,
      copy: Exam,
      enrolment: ExamEnrolment,
      participation: ExamParticipation,
      reservation: Reservation,
      record: ExamRecord,
      answerFile: Path,
      sharedFile: Path
  )

  /** Shared data on the prototype exam that students' copies refer to: option settings for its
    * questions and an exam attachment. Created once per test database. Returns the shared file.
    */
  protected def prepareSharedExam(): Path =
    val source = prototype()
    Option(source.attachment).map(a => Path.of(a.filePath)).getOrElse {
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
      sharedFile
    }

  /** A student who sat the prototype exam at `at`, with an essay answer carrying a file, a copy of
    * the teacher's exam attachment and a grading record. Without a participation the copy is one
    * that was created but never started, and `participation` and `record` are null.
    */
  protected def attempt(
      student: User,
      at: DateTime = t0,
      state: ExamState = ExamState.GRADED_LOGGED,
      lockedAt: Option[DateTime] = Some(t0),
      externalRef: Option[String] = None,
      started: Boolean = true
  ): Attempt =
    val sharedFile = prepareSharedExam()
    val fresh      = DB.find(classOf[Exam], prototype().id)
    val copy       = fresh.createCopy(ExamCopyContext.forStudentExam(student).build())
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

    if !started then
      Attempt(student, copy, enrolment, null, reservation, null, answerFile, sharedFile)
    else
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

  protected def exists[T](cls: Class[T], id: Long): Boolean = Option(DB.find(cls, id)).isDefined

  protected def sectionCount(examId: Long): Int =
    DB.find(classOf[ExamSection]).where().eq("exam.id", examId).findCount()

  protected def questionsOf(examId: Long): List[Long] =
    DB.find(classOf[ExamSectionQuestion]).where().eq("examSection.exam.id", examId).list
      .map(_.question.id.longValue)
      .distinct

  protected def pass(report: RetentionReport, p: RetentionPass): PassResult =
    report.passes.find(_.pass == p).getOrElse(fail(s"No pass $p"))
