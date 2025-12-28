// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import database.EbeanQueryExtensions
import features.examination.services.ExaminationError.*
import features.iop.transfer.services.ExternalAttachmentLoaderService
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, EssayAnswer}
import models.sections.ExamSectionQuestion
import models.user.User
import org.joda.time.DateTime
import play.api.{Environment, Logging, Mode}
import repository.ExaminationRepository
import security.BlockingIOExecutionContext
import services.config.{ByodConfigHandler, ConfigReader}
import services.exam.AutoEvaluationHandler
import services.mail.EmailComposer
import validation.answer.{ClozeTestAnswerDTO, EssayAnswerDTO}

import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.DurationInt
import scala.jdk.CollectionConverters.*

class ExaminationService @Inject() (
    private val examinationRepository: ExaminationRepository,
    private val autoEvaluationHandler: AutoEvaluationHandler,
    private val emailComposer: EmailComposer,
    private val externalAttachmentLoader: ExternalAttachmentLoaderService,
    private val byodConfigHandler: ByodConfigHandler,
    private val configReader: ConfigReader,
    private val environment: Environment,
    implicit private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging:

  def prepareExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Exam]] =
    examinationRepository
      .getCollaborativeExam(hash)
      .flatMap { oce =>
        val pp = ExaminationService.getPath(false)
        examinationRepository
          .getPrototype(hash, oce.orNull, pp)
          .flatMap { optionalPrototype =>
            examinationRepository
              .getPossibleClone(hash, user, oce.orNull, pp)
              .flatMap { possibleClone =>
                (optionalPrototype, possibleClone) match
                  case (None, None)            => Future.successful(Left(ExamNotFound))
                  case (Some(prototype), None) =>
                    // Exam is not started yet, create a new one for the student
                    createClone(prototype, user, oce, requestData, isInitialization = false)
                  case (_, Some(clone)) =>
                    // Exam started already
                    postProcessExisting(clone, user, oce, requestData)
              }
          }
      }

  def initializeExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    val pp = ExaminationService.getPath(false)
    examinationRepository
      .getCollaborativeExam(hash)
      .flatMap { oce =>
        examinationRepository
          .getPrototype(hash, oce.orNull, pp)
          .flatMap {
            case None => Future.successful(Right(()))
            case Some(exam) =>
              examinationRepository
                .getPossibleClone(hash, user, oce.orNull, pp)
                .flatMap {
                  case Some(_) => Future.successful(Right(()))
                  case None => createClone(
                      exam,
                      user,
                      oce,
                      requestData,
                      isInitialization = true
                    ).map(_.map(_ => ()))
                }
          }
      }

  def turnExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Either[ExaminationError, (Exam, ExamParticipation)] =
    DB.find(classOf[Exam])
      .fetch("examSections.sectionQuestions.question")
      .where()
      .eq("creator", user)
      .eq("hash", hash)
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
            val deadlineDays = Integer.parseInt(settings.getValue)
            val deadline     = ep.getEnded.plusDays(deadlineDays)
            ep.setDeadline(deadline)
            ep.save()
            exam.setState(Exam.State.REVIEW)
            exam.update()
            if exam.isPrivate then notifyTeachers(exam)
            autoEvaluationHandler.autoEvaluate(exam)
            Right((exam, ep))

  def abortExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Either[ExaminationError, (Exam, ExamParticipation)] =
    DB.find(classOf[Exam])
      .where()
      .eq("creator", user)
      .eq("hash", hash)
      .find match
      case None => Left(ExamNotFound)
      case Some(exam) =>
        findParticipation(exam, user) match
          case None => Left(ParticipationNotFound)
          case Some(ep) =>
            setDurations(ep)
            ep.save()
            exam.setState(Exam.State.ABORTED)
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
    validateEnrolment(hash, user, requestData).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
          case None => Future.successful(Left(QuestionNotFound))
          case Some(question) =>
            val answer = Option(question.getEssayAnswer) match
              case None =>
                new EssayAnswer()
              case Some(existingAnswer) =>
                answerDTO.objectVersion.foreach(ov => existingAnswer.setObjectVersion(ov))
                existingAnswer
            answer.setAnswer(answerDTO.answer)
            answer.save()
            question.setEssayAnswer(answer)
            question.save()
            Future.successful(Right(answer))
    }

  def answerMultiChoice(
      hash: String,
      questionId: Long,
      user: User,
      optionIds: Seq[Long],
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    validateEnrolment(hash, user, requestData).map {
      case Left(error) => Left(error)
      case Right(_) =>
        Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
          case None => Left(QuestionNotFound)
          case Some(question) =>
            question.getOptions.asScala.foreach { o =>
              o.setAnswered(optionIds.contains(o.getId))
              o.update()
            }
            Right(())
    }

  def answerClozeTest(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: ClozeTestAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExaminationError, ClozeTestAnswer]] =
    validateEnrolment(hash, user, requestData).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
          case None => Future.successful(Left(QuestionNotFound))
          case Some(esq) =>
            val objectVersion = answerDTO.objectVersion.getOrElse(0L)
            val answer = Option(esq.getClozeTestAnswer).getOrElse {
              new ClozeTestAnswer()
            }
            answer.setObjectVersion(objectVersion)
            answer.setAnswer(answerDTO.answer)
            answer.save()
            Future.successful(Right(answer))
    }

  // Private helper methods

  private def postProcessClone(
      enrolment: ExamEnrolment,
      exam: Exam
  ): Future[Either[ExaminationError, Exam]] =
    Option(enrolment.getCollaborativeExam) match
      case None =>
        // No collaborative exam, proceed synchronously
        exam.setCloned(true)
        exam.setDerivedMaxScores()
        examinationRepository.processClozeTestQuestions(exam)
        Future.successful(Right(exam))
      case Some(_) =>
        // Fetch external attachments asynchronously, then process
        externalAttachmentLoader
          .fetchExternalAttachmentsAsLocal(exam)
          .map { _ =>
            exam.setCloned(true)
            exam.setDerivedMaxScores()
            examinationRepository.processClozeTestQuestions(exam)
            Right(exam)
          }
          .recover { case e =>
            logger.error("Could not fetch external attachments!", e)
            // Continue anyway - attachments are optional
            exam.setCloned(true)
            exam.setDerivedMaxScores()
            examinationRepository.processClozeTestQuestions(exam)
            Right(exam)
          }

  private def postProcessExisting(
      clone: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      requestData: RequestData
  ): Future[Either[ExaminationError, Exam]] =
    // sanity check
    if !clone.hasState(Exam.State.INITIALIZED, Exam.State.STUDENT_STARTED) then
      Future.successful(Left(InvalidExamState))
    else
      examinationRepository
        .findEnrolment(user, clone, ce.orNull, false)
        .flatMap {
          case None => Future.successful(Left(EnrolmentNotFound))
          case Some(enrolment) =>
            validateEnrolment(enrolment, requestData).flatMap {
              case Left(error) => Future.successful(Left(error))
              case Right(_) =>
                examinationRepository
                  .createFinalExam(clone, user, enrolment)
                  .map(e => Right(e))
            }
        }

  private def createClone(
      prototype: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      requestData: RequestData,
      isInitialization: Boolean
  ): Future[Either[ExaminationError, Exam]] =
    examinationRepository
      .findEnrolment(user, prototype, ce.orNull, isInitialization)
      .flatMap {
        case None => Future.successful(Left(EnrolmentNotFound))
        case Some(enrolment) =>
          validateEnrolment(enrolment, requestData).flatMap {
            case Left(error) => Future.successful(Left(error))
            case Right(_) =>
              examinationRepository
                .createExam(prototype, user, enrolment)
                .flatMap {
                  case None       => Future.successful(Left(FailedToCreateExam))
                  case Some(exam) => postProcessClone(enrolment, exam)
                }
          }
      }

  private def findParticipation(exam: Exam, user: User): Option[ExamParticipation] =
    DB.find(classOf[ExamParticipation])
      .where()
      .eq("exam.id", exam.getId)
      .eq("user", user)
      .isNull("ended")
      .find

  private def setDurations(ep: ExamParticipation): Unit =
    ep.setEnded(DateTime.now())
    ep.setDuration(new DateTime(ep.getEnded.getMillis - ep.getStarted.getMillis))

  private def validateEnrolment(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExaminationError, Unit]] =
    val enrolment = DB
      .find(classOf[ExamEnrolment])
      .where()
      .eq("exam.hash", hash)
      .eq("exam.creator", user)
      .eq("exam.state", Exam.State.STUDENT_STARTED)
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
      val exam        = enrolment.getExam
      val isByod      = Option(exam).exists(_.getImplementation == Exam.Implementation.CLIENT_AUTH)
      val isUnchecked = Option(exam).exists(_.getImplementation == Exam.Implementation.WHATEVER)

      if isByod then
        Future.successful(
          byodConfigHandler
            .checkUserAgent(
              requestData.headers,
              requestData.uri,
              requestData.host,
              enrolment.getExaminationEventConfiguration.getConfigKey
            )
            .map(error => Left(ValidationError(error.header.status.toString)))
            .getOrElse(Right(()))
        )
      else if isUnchecked then Future.successful(Right(()))
      // For regular exams, check if IP matches - if not, provide detailed error with room info
      else if environment.mode != Mode.Dev &&
        Option(enrolment.getReservation)
          .flatMap(r => Option(r.getMachine))
          .exists(m => m.getIpAddress != requestData.remoteAddress)
      then
        examinationRepository
          .findRoom(enrolment)
          .map {
            case None => Left(RoomNotFound)
            case Some(room) =>
              Left(WrongExamMachine)
          }
      else
        // For all other cases, use basic validation
        validateBasicEnrolment(enrolment, requestData, skipIpCheck = true)

  private def validateBasicEnrolment(
      enrolment: ExamEnrolment,
      requestData: RequestData,
      skipIpCheck: Boolean = false
  ): Future[Either[ExaminationError, Unit]] =
    if Option(enrolment).isEmpty then Future.successful(Left(ReservationNotFound))
    else if Option(enrolment.getReservation).isEmpty then
      Future.successful(Left(ReservationNotFound))
    else if Option(enrolment.getReservation.getMachine).isEmpty then
      Future.successful(Left(ReservationMachineNotFound))
    else if !skipIpCheck && environment.mode != Mode.Dev &&
      !enrolment.getReservation.getMachine.getIpAddress.equals(requestData.remoteAddress)
    then Future.successful(Left(WrongExamMachine))
    else Future.successful(Right(()))

  private def notifyTeachers(exam: Exam): Unit =
    val recipients = exam.getParent.getExamOwners.asScala.toSet ++
      exam.getExamInspections.asScala.map(_.getUser).toSet

    emailComposer.scheduleEmail(1.seconds) {
      recipients.foreach { r =>
        emailComposer.composePrivateExamEnded(r, exam)
        logger.info(s"Email sent to ${r.getEmail}")
      }
    }

object ExaminationService:
  def getPath(includeEnrolment: Boolean): PathProperties =
    val path = """(*,
                  |course(*),
                  |examType(*),
                  |executionType(*),
                  |examParticipation(*),
                  |examLanguages(*),
                  |attachment(*),
                  |examOwners(*),
                  |examInspections(*, user(*)),
                  |examSections(*,
                  |  examMaterials(*),
                  |  sectionQuestions(*,
                  |    question(*, attachment(*)),
                  |    options(*, option(*)),
                  |    essayAnswer(*, attachment(*)),
                  |    clozeTestAnswer(*)
                  |  )
                  |)
                  |)""".stripMargin
    PathProperties.parse(if includeEnrolment then s"(exam$path)" else path)
