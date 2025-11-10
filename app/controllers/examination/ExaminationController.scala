// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.examination

import controllers.iop.transfer.api.ExternalAttachmentLoader
import impl.AutoEvaluationHandler
import impl.mail.EmailComposer
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.{ByodConfigHandler, ConfigReader}
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, EssayAnswer}
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.libs.json.JsValue
import play.api.mvc.*
import play.api.{Environment, Logging, Mode}
import play.db.ebean.Transactional
import repository.ExaminationRepository
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.interceptors.scala.{ExamActionRouter, SecureController, SensitiveDataFilter}
import validation.scala.answer.{ClozeTestAnswerValidator, EssayAnswerValidator}

import javax.inject.Inject
import scala.concurrent.duration.DurationInt
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class ExaminationController @Inject() (
    emailComposer: EmailComposer,
    examinationRepository: ExaminationRepository,
    actor: ActorSystem,
    autoEvaluationHandler: AutoEvaluationHandler,
    protected val environment: Environment,
    externalAttachmentLoader: ExternalAttachmentLoader,
    byodConfigHandler: ByodConfigHandler,
    configReader: ConfigReader,
    examActionRouter: ExamActionRouter,
    val authenticated: AuthenticatedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends SecureController
    with EnrolmentValidator
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  override protected def sensitiveFields: Set[String] =
    Set("score", "defaultScore", "correctOption", "claimChoiceType", "configKey")

  private def postProcessClone(enrolment: ExamEnrolment, oe: Option[Exam]): Future[Result] =
    oe match
      case None => Future.successful(InternalServerError("Failed to create exam"))
      case Some(newExam) =>
        Option(enrolment.getCollaborativeExam) match
          case None =>
            // No collaborative exam, proceed synchronously
            newExam.setCloned(true)
            newExam.setDerivedMaxScores()
            examinationRepository.processClozeTestQuestions(newExam)
            Future.successful(Ok(newExam.asJson(ExaminationController.getPath(false))))
          case Some(_) =>
            // Fetch external attachments asynchronously, then process
            externalAttachmentLoader
              .fetchExternalAttachmentsAsLocal(newExam)
              .map { _ =>
                newExam.setCloned(true)
                newExam.setDerivedMaxScores()
                examinationRepository.processClozeTestQuestions(newExam)
                Ok(newExam.asJson(ExaminationController.getPath(false)))
              }
              .recover { case e =>
                logger.error("Could not fetch external attachments!", e)
                // Continue anyway - attachments are optional
                newExam.setCloned(true)
                newExam.setDerivedMaxScores()
                examinationRepository.processClozeTestQuestions(newExam)
                Ok(newExam.asJson(ExaminationController.getPath(false)))
              }

  private def postProcessExisting(
      clone: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      request: Request[AnyContent]
  ): Future[Result] =
    // sanity check
    if !clone.hasState(Exam.State.INITIALIZED, Exam.State.STUDENT_STARTED) then
      Future.successful(Forbidden("Invalid exam state"))
    else
      examinationRepository
        .findEnrolment(user, clone, ce.orNull, false)
        .flatMap {
          case None => Future.successful(Forbidden("Enrolment not found"))
          case Some(enrolment) =>
            getEnrolmentError(enrolment, request).flatMap {
              case Some(error) => Future.successful(error)
              case None =>
                examinationRepository
                  .createFinalExam(clone, user, enrolment)
                  .map(e => Ok(e.asJson(ExaminationController.getPath(false))))
            }
        }

  private def createClone(
      prototype: Exam,
      user: User,
      ce: Option[CollaborativeExam],
      request: Request[AnyContent],
      isInitialization: Boolean
  ): Future[Result] =
    examinationRepository
      .findEnrolment(user, prototype, ce.orNull, isInitialization)
      .flatMap {
        case None => Future.successful(Forbidden("Enrolment not found"))
        case Some(enrolment) =>
          getEnrolmentError(enrolment, request).flatMap {
            case Some(error) => Future.successful(error)
            case None =>
              examinationRepository
                .createExam(prototype, user, enrolment)
                .flatMap {
                  case None       => Future.successful(InternalServerError("Failed to create exam"))
                  case Some(exam) => postProcessClone(enrolment, Some(exam))
                }
          }
      }

  private def prepareExam(ce: Option[CollaborativeExam], hash: String, request: Request[AnyContent]): Future[Result] =
    val user = request.attrs(Auth.ATTR_USER)
    val pp   = ExaminationController.getPath(false)
    examinationRepository
      .getPrototype(hash, ce.orNull, pp)
      .flatMap { optionalPrototype =>
        examinationRepository
          .getPossibleClone(hash, user, ce.orNull, pp)
          .flatMap { possibleClone =>
            (optionalPrototype, possibleClone) match
              case (None, None)            => Future.successful(NotFound("Exam not found"))
              case (Some(prototype), None) =>
                // Exam is not started yet, create a new one for the student
                createClone(prototype, user, ce, request, isInitialization = false)
              case (_, Some(clone)) =>
                // Exam started already
                postProcessExisting(clone, user, ce, request)
          }
      }

  private def prepareExam(hash: String, request: Request[AnyContent]): Future[Result] =
    examinationRepository
      .getCollaborativeExam(hash)
      .flatMap(oce => prepareExam(oce, hash, request))

  def startExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).andThen(examActionRouter).async { request =>
      prepareExam(hash, request)
    }

  def initializeExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).andThen(examActionRouter).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val pp   = ExaminationController.getPath(false)
      examinationRepository
        .getCollaborativeExam(hash)
        .flatMap { oce =>
          examinationRepository
            .getPrototype(hash, oce.orNull, pp)
            .flatMap {
              case None => Future.successful(Ok)
              case Some(exam) =>
                examinationRepository
                  .getPossibleClone(hash, user, oce.orNull, pp)
                  .flatMap {
                    case Some(_) => Future.successful(Ok)
                    case None    => createClone(exam, user, oce, request, isInitialization = true)
                  }
            }
        }
    }

  @Transactional
  def turnExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      getEnrolmentError(hash, request).map {
        case Some(error) => error
        case None =>
          val user = request.attrs(Auth.ATTR_USER)
          DB.find(classOf[Exam])
            .fetch("examSections.sectionQuestions.question")
            .where()
            .eq("creator", user)
            .eq("hash", hash)
            .find match
            case None => NotFound("i18n_error_exam_not_found")
            case Some(exam) =>
              val oep     = findParticipation(exam, user)
              val session = request.session - "ongoingExamHash"
              oep match
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
                  Ok.withSession(session)
                case None =>
                  Ok.withSession(session)
      }
    }

  @Transactional
  def abortExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      getEnrolmentError(hash, request).map {
        case Some(error) => error
        case None =>
          val user = request.attrs(Auth.ATTR_USER)
          DB.find(classOf[Exam])
            .where()
            .eq("creator", user)
            .eq("hash", hash)
            .find match
            case None => NotFound("i18n_error_exam_not_found")
            case Some(exam) =>
              val oep     = findParticipation(exam, user)
              val session = request.session - "ongoingExamHash"
              oep match
                case Some(ep) =>
                  setDurations(ep)
                  ep.save()
                  exam.setState(Exam.State.ABORTED)
                  exam.update()
                  if exam.isPrivate then notifyTeachers(exam)
                  Ok.withSession(session)
                case None =>
                  Forbidden("Participation not found").withSession(session)
      }
    }

  def answerEssay(hash: String, questionId: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(EssayAnswerValidator.filter)
      .async(parse.json) { request =>
        getEnrolmentError(hash, request).flatMap {
          case Some(error) => Future.successful(error)
          case None =>
            val answerDTO = request.attrs(EssayAnswerValidator.ESSAY_ANSWER_KEY)
            Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
              case None => Future.successful(Forbidden("Question not found"))
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
                Future.successful(Ok(answer.asJson))
        }
      }

  def answerMultiChoice(hash: String, qid: Long): Action[JsValue] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async(parse.json) { request =>
      getEnrolmentError(hash, request).map {
        case Some(error) => error
        case None =>
          val optionIds = (request.body \ "oids").asOpt[Seq[Long]].getOrElse(Seq.empty)
          Option(DB.find(classOf[ExamSectionQuestion], qid)) match {
            case None => Forbidden("Question not found")
            case Some(question) =>
              question.getOptions.asScala.foreach { o =>
                o.setAnswered(optionIds.contains(o.getId))
                o.update()
              }
              Ok
          }
      }
    }

  def answerClozeTest(hash: String, questionId: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(ClozeTestAnswerValidator.filter)
      .async(parse.json) { request =>
        getEnrolmentError(hash, request).flatMap {
          case Some(error) => Future.successful(error)
          case None =>
            val answerDTO     = request.attrs(ClozeTestAnswerValidator.CLOZE_TEST_ANSWER_KEY)
            val objectVersion = answerDTO.objectVersion.getOrElse(0L)
            Option(DB.find(classOf[ExamSectionQuestion], questionId)) match
              case None => Future.successful(Forbidden("Question not found"))
              case Some(esq) =>
                val answer = Option(esq.getClozeTestAnswer).getOrElse {
                  new ClozeTestAnswer()
                }
                answer.setObjectVersion(objectVersion)
                answer.setAnswer(answerDTO.answer)
                answer.save()
                Future.successful(Ok(answer.asJson(PathProperties.parse("(id, objectVersion, answer)"))))
        }
      }

  private def findParticipation(exam: Exam, user: User) =
    DB.find(classOf[ExamParticipation])
      .where()
      .eq("exam.id", exam.getId)
      .eq("user", user)
      .isNull("ended")
      .find

  private def setDurations(ep: ExamParticipation): Unit =
    ep.setEnded(DateTime.now())
    ep.setDuration(new DateTime(ep.getEnded.getMillis - ep.getStarted.getMillis))

  protected def getEnrolmentError[A](enrolment: ExamEnrolment, request: Request[A]): Future[Option[Result]] =
    // If this is null, it means someone is either trying to access an exam by wrong hash
    // or the reservation is not in effect right now.
    if Option(enrolment).isEmpty then Future.successful(Some(Forbidden("i18n_reservation_not_found")))
    else
      val exam        = enrolment.getExam
      val isByod      = exam != null && exam.getImplementation == Exam.Implementation.CLIENT_AUTH
      val isUnchecked = exam != null && exam.getImplementation == Exam.Implementation.WHATEVER

      if isByod then
        Future.successful(
          byodConfigHandler
            .checkUserAgent(request, enrolment.getExaminationEventConfiguration.getConfigKey)
        )
      else if isUnchecked then Future.successful(None)
      // For regular exams, check if IP matches - if not, provide detailed error with room info
      else if environment.mode != Mode.Dev &&
        Option(enrolment.getReservation)
          .flatMap(r => Option(r.getMachine))
          .exists(m => m.getIpAddress != request.remoteAddress)
      then
        examinationRepository
          .findRoom(enrolment)
          .map {
            case None => Some(NotFound("Room not found"))
            case Some(room) =>
              val message =
                "i18n_wrong_exam_machine " +
                  room.getName +
                  ", " +
                  room.getMailAddress.toString +
                  ", i18n_exam_machine " +
                  enrolment.getReservation.getMachine.getName
              Some(Forbidden(message))
          }
      else
        // For all other cases, use basic validation
        validateBasicEnrolment(enrolment, request, skipIpCheck = true)

  private def getEnrolmentError[A](hash: String, request: Request[A]): Future[Option[Result]] = {
    val user = request.attrs(Auth.ATTR_USER)
    val enrolment = DB
      .find(classOf[ExamEnrolment])
      .where()
      .eq("exam.hash", hash)
      .eq("exam.creator", user)
      .eq("exam.state", Exam.State.STUDENT_STARTED)
      .findOne()
    getEnrolmentError(enrolment, request)
  }

  private def notifyTeachers(exam: Exam): Unit =
    val recipients = exam.getParent.getExamOwners.asScala.toSet ++
      exam.getExamInspections.asScala.map(_.getUser).toSet

    actor.scheduler.scheduleOnce(1.seconds) {
      recipients.foreach { r =>
        emailComposer.composePrivateExamEnded(r, exam)
        logger.info(s"Email sent to ${r.getEmail}")
      }
    }

object ExaminationController:
  def getPath(includeEnrolment: Boolean): PathProperties =
    val path =
      "(id, name, state, instruction, hash, duration, cloned, external, implementation, " +
        "course(id, code, name), examType(id, type), executionType(id, type), " +
        "examParticipation(id), " +
        "examLanguages(code), attachment(fileName), examOwners(firstName, lastName)" +
        "examInspections(*, user(id, firstName, lastName))" +
        "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," +
        "examMaterials(name, author, isbn), " +
        "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, derivedMinScore, " +
        "question(id, type, question, attachment(id, fileName))" +
        "options(id, answered, option(id, option))" +
        "essayAnswer(id, answer, objectVersion, attachment(fileName))" +
        "clozeTestAnswer(id, question, answer, objectVersion)" +
        ")))"
    PathProperties.parse(if (includeEnrolment) s"(exam$path)" else path)
