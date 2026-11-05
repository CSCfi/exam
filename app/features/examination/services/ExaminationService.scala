// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import cats.data.EitherT
import cats.syntax.all.*
import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import features.examination.services.ExaminationError.*
import features.iop.transfer.services.ExternalAttachmentLoaderService
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamImplementation, ExamState}
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, EssayAnswer}
import models.sections.ExamSectionQuestion
import models.user.User
import play.api.{Environment, Logging, Mode}
import repository.ExaminationRepository
import security.BlockingIOExecutionContext
import services.config.{ByodConfigHandler, ConfigReader}
import services.datetime.{AppClock, DateTimeHandler}
import services.exam.AutoEvaluationHandler
import services.mail.EmailComposer
import validation.answer.{ClozeTestAnswerDTO, EssayAnswerDTO}

import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.*
import scala.util.Try
import scala.util.control.NonFatal

class ExaminationService @Inject() (
    private val examinationRepository: ExaminationRepository,
    private val autoEvaluationHandler: AutoEvaluationHandler,
    private val emailComposer: EmailComposer,
    private val externalAttachmentLoader: ExternalAttachmentLoaderService,
    private val byodConfigHandler: ByodConfigHandler,
    private val configReader: ConfigReader,
    private val environment: Environment,
    private val clock: AppClock,
    private val dateTimeHandler: DateTimeHandler,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:

  def prepareExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Exam]] =
    val pp = ExaminationService.getPath(false)
    for
      oce       <- examinationRepository.getCollaborativeExam(hash)
      prototype <- examinationRepository.getPrototype(hash, oce.orNull, pp)
      clone     <- examinationRepository.getPossibleClone(hash, user, oce.orNull, pp)
      result <- (prototype, clone) match
        case (None, None)            => Future.successful(Left(ExamNotFound))
        case (Some(prototype), None) =>
          // Exam is not started yet, create a new one for the student
          createClone(prototype, user, oce, requestData, isInitialization = false)
        case (_, Some(clone)) =>
          // Exam started already
          postProcessExisting(clone, user, oce, requestData)
    yield result

  def initializeExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    val pp = ExaminationService.getPath(false)
    for
      oce       <- examinationRepository.getCollaborativeExam(hash)
      prototype <- examinationRepository.getPrototype(hash, oce.orNull, pp)
      clone <- prototype.flatTraverse(_ =>
        examinationRepository.getPossibleClone(hash, user, oce.orNull, pp)
      )
      result <- (prototype, clone) match
        case (Some(exam), None) =>
          createClone(exam, user, oce, requestData, isInitialization = true).map(_.void)
        case _ => Future.successful(Right(()))
    yield result

  def turnExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Either[ExaminationError, (Exam, ExamParticipation)] =
    DB.find(classOf[Exam])
      .fetch(path[Exam]("examSections.sectionQuestions.question"))
      .where()
      .eq(path[Exam]("creator"), user)
      .eq(path[Exam]("hash"), hash)
      .find match
      case None => Left(ExamNotFound)
      case Some(exam) =>
        findParticipation(exam, user) match
          case None => Left(ParticipationNotFound)
          case Some(ep) =>
            setDurations(ep)

            val settings = configReader.getOrCreateSettings(
              "review_deadline",
              None,
              Some("14")
            )
            val deadlineDays = Integer.parseInt(settings.value)
            val deadline     = ep.ended.plus(Duration.ofDays(deadlineDays))
            ep.deadline = deadline
            ep.save()
            exam.state = ExamState.REVIEW
            exam.update()
            if exam.isPrivate then notifyTeachers(exam)
            autoEvaluationHandler.autoEvaluate(exam).left.foreach(msg =>
              logger.warn(s"Exam ${exam.id} not auto-evaluated: $msg")
            )
            Right((exam, ep))

  def abortExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Either[ExaminationError, (Exam, ExamParticipation)] =
    DB.find(classOf[Exam])
      .where()
      .eq(path[Exam]("creator"), user)
      .eq(path[Exam]("hash"), hash)
      .find match
      case None => Left(ExamNotFound)
      case Some(exam) =>
        findParticipation(exam, user) match
          case None => Left(ParticipationNotFound)
          case Some(ep) =>
            setDurations(ep)
            ep.save()
            exam.state = ExamState.ABORTED
            exam.update()
            if exam.isPrivate then notifyTeachers(exam)
            Right((exam, ep))

  def answerEssay(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: EssayAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExaminationError, EssayAnswer]] =
    withOwnQuestion(hash, questionId, user, requestData) { question =>
      val answer = Option(question.essayAnswer) match
        case None => new EssayAnswer()
        case Some(existingAnswer) =>
          answerDTO.objectVersion.foreach(ov => existingAnswer.objectVersion = ov)
          existingAnswer
      answer.answer = answerDTO.answer
      answer.save()
      question.essayAnswer = answer
      question.save()
      answer
    }

  def answerMultiChoice(
      hash: String,
      questionId: Long,
      user: User,
      optionIds: Seq[Long],
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    withOwnQuestion(hash, questionId, user, requestData) { question =>
      question.options.asScala.foreach { o =>
        o.answered = optionIds.contains(o.id)
        o.update()
      }
    }

  def answerClozeTest(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: ClozeTestAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExaminationError, ClozeTestAnswer]] =
    withOwnQuestion(hash, questionId, user, requestData) { esq =>
      val answer = Option(esq.clozeTestAnswer).getOrElse(new ClozeTestAnswer())
      answer.objectVersion = answerDTO.objectVersion.getOrElse(0L)
      answer.answer = answerDTO.answer
      answer.save()
      answer
    }

  // Private helper methods

  private def postProcessClone(enrolment: ExamEnrolment, exam: Exam): Future[Exam] =
    val attachmentsFetched = Option(enrolment.collaborativeExam) match
      case None => Future.unit
      case Some(_) =>
        externalAttachmentLoader.fetchExternalAttachmentsAsLocal(exam).recover {
          // Continue anyway - attachments are optional
          case NonFatal(e) => logger.error("Could not fetch external attachments!", e)
        }
    attachmentsFetched.map { _ =>
      exam.cloned = true
      exam.setDerivedMaxScores()
      examinationRepository.processClozeTestQuestions(exam)
      exam
    }

  private def postProcessExisting(
      clone: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      requestData: RequestData
  ): Future[Either[ExaminationError, Exam]] =
    (for
      // sanity check
      _ <- EitherT.cond[Future](
        clone.hasState(ExamState.INITIALIZED, ExamState.STUDENT_STARTED),
        (),
        InvalidExamState
      )
      enrolment <- EitherT.fromOptionF(
        examinationRepository.findEnrolment(user, clone, ce.orNull, false),
        EnrolmentNotFound
      )
      _    <- EitherT(validateEnrolment(enrolment, requestData))
      exam <- EitherT.liftF(examinationRepository.createFinalExam(clone, user, enrolment))
    yield exam).value

  private def createClone(
      prototype: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      requestData: RequestData,
      isInitialization: Boolean
  ): Future[Either[ExaminationError, Exam]] =
    (for
      enrolment <- EitherT.fromOptionF(
        examinationRepository.findEnrolment(user, prototype, ce.orNull, isInitialization),
        EnrolmentNotFound
      )
      _ <- EitherT(validateEnrolment(enrolment, requestData))
      exam <- EitherT.fromOptionF(
        examinationRepository.createExam(prototype, user, enrolment),
        FailedToCreateExam
      )
      result <- EitherT.liftF(postProcessClone(enrolment, exam))
    yield result).value

  private def withOwnQuestion[A](
      hash: String,
      questionId: Long,
      user: User,
      requestData: RequestData
  )(f: ExamSectionQuestion => A): Future[Either[ExaminationError, A]] =
    (for
      _ <- EitherT(validateEnrolment(hash, user, requestData))
      question <- EitherT.fromOption[Future](
        findOwnSectionQuestion(questionId, hash, user),
        QuestionNotFound
      )
    yield f(question)).value

  // Enrolment validation only proves the caller owns the exam identified by `hash`; the answer
  // methods still receive an arbitrary questionId. Scope the lookup to the caller's own exam so a
  // student can't write answers into another student's exam instance by passing a foreign question id.
  private def findOwnSectionQuestion(
      questionId: Long,
      hash: String,
      user: User
  ): Option[ExamSectionQuestion] =
    DB.find(classOf[ExamSectionQuestion])
      .where()
      .idEq(questionId)
      .eq(path[ExamSectionQuestion]("examSection.exam.hash"), hash)
      .eq(path[ExamSectionQuestion]("examSection.exam.creator"), user)
      .find

  private def findParticipation(exam: Exam, user: User): Option[ExamParticipation] =
    DB.find(classOf[ExamParticipation])
      .where()
      .eq(path[ExamParticipation]("exam.id"), exam.id)
      .eq(path[ExamParticipation]("user"), user)
      .isNull(path[ExamParticipation]("ended"))
      .find

  private def setDurations(ep: ExamParticipation): Unit =
    ep.ended = clock.now()
    ep.duration = Instant.ofEpochMilli(ep.ended.toEpochMilli - ep.started.toEpochMilli)

  private def validateEnrolment(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    val enrolment = DB
      .find(classOf[ExamEnrolment])
      .where()
      .eq(path[ExamEnrolment]("exam.hash"), hash)
      .eq(path[ExamEnrolment]("exam.creator"), user)
      .eq(path[ExamEnrolment]("exam.state"), ExamState.STUDENT_STARTED)
      .findOne()
    validateEnrolment(enrolment, requestData)

  private def validateEnrolment(
      enrolment: ExamEnrolment,
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    // If this is null, it means someone is either trying to access an exam by wrong hash
    // or the reservation is not in effect right now.
    if Option(enrolment).isEmpty then Future.successful(Left(ReservationNotFound))
    else
      val exam        = enrolment.exam
      val isByod      = Option(exam).exists(_.implementation == ExamImplementation.CLIENT_AUTH)
      val isUnchecked = Option(exam).exists(_.implementation == ExamImplementation.WHATEVER)

      if isByod then
        Future.successful(
          byodConfigHandler
            .checkUserAgent(
              requestData.headers,
              requestData.uri,
              requestData.host,
              enrolment.examinationEventConfiguration.configKey
            )
            .map(error => Left(ValidationError(error.header.status.toString)))
            .getOrElse(Right(()))
        )
      else if isUnchecked then Future.successful(Right(()))
      // For regular exams, check if IP matches - if not, provide detailed error with room info
      else if environment.mode != Mode.Dev &&
        Option(enrolment.reservation)
          .flatMap(r => Option(r.machine))
          .exists(m => m.ipAddress != requestData.remoteAddress)
      then
        examinationRepository
          .findRoom(enrolment)
          .map(room => Left(if room.isEmpty then RoomNotFound else WrongExamMachine))
      else
        Future.successful(validateReservation(enrolment))

  // The IP address has been checked by the caller
  private def validateReservation(enrolment: ExamEnrolment): Either[ExaminationError, Unit] =
    for
      reservation <- Option(enrolment.reservation).toRight(ReservationNotFound)
      _           <- Option(reservation.machine).toRight(ReservationMachineNotFound)
    yield ()

  private def notifyTeachers(exam: Exam): Unit =
    val recipients = exam.parent.examOwners.asScala.toSet ++
      exam.examInspections.asScala.map(_.user).toSet

    emailComposer.scheduleEmail(1.seconds) {
      recipients.foreach { r =>
        Try(emailComposer.composePrivateExamEnded(r, exam)).fold(
          e => logger.error(s"Failed to send email to ${r.email}", e),
          _ => logger.info(s"Email sent to ${r.email}")
        )
      }
    }

object ExaminationService:
  // An inline val rather than a stripMargin string, so that both getPath variants reach the props
  // macro as literals and get checked
  private inline val ExamSpec = "(*, " +
    "course(*), " +
    "examType(*), " +
    "executionType(*), " +
    "examParticipation(*), " +
    "examLanguages(*), " +
    "attachment(*), " +
    "examOwners(*), " +
    "examInspections(*, user(*)), " +
    "examSections(*, " +
    "  examMaterials(*), " +
    "  sectionQuestions(*, " +
    "    question(*, attachment(*)), " +
    "    options(*, option(*)), " +
    "    essayAnswer(*, attachment(*)), " +
    "    clozeTestAnswer(*)" +
    "  )" +
    ")" +
    ")"

  def getPath(includeEnrolment: Boolean): PathProperties =
    if includeEnrolment then props[ExamEnrolment]("(exam" + ExamSpec + ")")
    else props[Exam](ExamSpec)
