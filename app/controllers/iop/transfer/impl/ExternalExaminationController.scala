// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.examination.{EnrolmentValidator, ExaminationController}
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.ByodConfigHandler
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.iop.ExternalExam
import models.questions.{ClozeTestAnswer, EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.{Environment, Logging}
import play.api.libs.json.JsValue
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.AuditedAction
import system.interceptors.scala.{SecureController, SensitiveDataFilter}
import validation.scala.answer.{ClozeTestAnswerValidator, EssayAnswerValidator}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalExaminationController @Inject() (
    dateTimeHandler: DateTimeHandler,
    byodConfigHandler: ByodConfigHandler,
    val environment: Environment,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val sensitiveDataFilter: SensitiveDataFilter,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends SecureController
    with EnrolmentValidator
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  override protected def sensitiveFields: Set[String] =
    Set("score", "defaultScore", "correctOption", "configKey")

  def startExam(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      getExternalExam(hash, user) match
        case None => Future.successful(Forbidden)
        case Some(externalExam) =>
          getEnrolment(user, externalExam) match
            case None => Future.successful(Forbidden)
            case Some(enrolment) =>
              Try(externalExam.deserialize()) match
                case scala.util.Failure(_) => Future.successful(InternalServerError)
                case scala.util.Success(newExam) =>
                  validateBasicEnrolment(enrolment, request).map {
                    case Some(error) => error
                    case None =>
                      if newExam.getState == Exam.State.PUBLISHED then
                        newExam.setState(Exam.State.STUDENT_STARTED)
                        Try(externalExam.serialize(newExam)) match
                          case scala.util.Failure(_) => InternalServerError
                          case scala.util.Success(_) =>
                            val now = dateTimeHandler.adjustDST(
                              DateTime.now(),
                              enrolment.getReservation.getMachine.getRoom
                            )
                            externalExam.setStarted(now)
                            externalExam.update()
                            processExamForResponse(newExam)
                      else processExamForResponse(newExam)
                  }
    }

  private def processExamForResponse(exam: Exam) =
    exam.setCloned(false)
    exam.setExternal(true)
    exam.setDerivedMaxScores()
    processClozeTestQuestions(exam)
    Ok(exam.asJson(ExaminationController.getPath(false)))

  private def processClozeTestQuestions(exam: Exam): Unit =
    val clozeTestQuestions = exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter(_.getQuestion.getType == Question.Type.ClozeTestQuestion)
      .toList

    val questionsToHide = clozeTestQuestions.map { esq =>
      val answer = Option(esq.getClozeTestAnswer).getOrElse(new ClozeTestAnswer())
      answer.setQuestion(esq)
      esq.setClozeTestAnswer(answer)
      esq.getQuestion
    }.toSet
    questionsToHide.foreach(_.setQuestion(null))

  def turnExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      terminateExam(hash, Exam.State.REVIEW, user)
    }

  def abortExam(hash: String): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      terminateExam(hash, Exam.State.ABORTED, user)
    }

  def answerMultiChoice(hash: String, qid: Long): Action[JsValue] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.STUDENT))).async(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getEnrolmentError(hash, user, request).map {
        case Some(error) => error
        case None =>
          getExternalExam(hash, user) match
            case None => Forbidden
            case Some(ee) =>
              val optionIds = (request.body \ "oids").asOpt[Seq[Long]].getOrElse(Seq.empty).toList
              findSectionQuestion(ee, qid) match
                case Left(error)           => error
                case Right((content, esq)) => processOptions(optionIds, esq, ee, content)
      }
    }

  def answerEssay(hash: String, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(EssayAnswerValidator.filter)
    .async(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getEnrolmentError(hash, user, request).flatMap {
        case Some(error) => Future.successful(error)
        case None =>
          val answerDTO = request.attrs(EssayAnswerValidator.ESSAY_ANSWER_KEY)
          getExternalExam(hash, user) match
            case None => Future.successful(Forbidden)
            case Some(ee) =>
              Try(ee.deserialize()) match
                case scala.util.Failure(_) => Future.successful(InternalServerError)
                case scala.util.Success(content) =>
                  findQuestion(qid, content) match
                    case None => Future.successful(Forbidden)
                    case Some(question) =>
                      val answer = Option(question.getEssayAnswer).getOrElse(new EssayAnswer())
                      // Handle optimistic locking
                      val hasVersionConflict = answerDTO.objectVersion match
                        case Some(ov) if answer.getObjectVersion > ov => true
                        case Some(ov) =>
                          answer.setObjectVersion(ov + 1)
                          false
                        case None => false
                      if hasVersionConflict then Future.successful(Forbidden("i18n_error_data_has_changed"))
                      else
                        answer.setAnswer(answerDTO.answer)
                        question.setEssayAnswer(answer)

                        Try(ee.serialize(content)) match
                          case scala.util.Failure(_) => Future.successful(InternalServerError)
                          case scala.util.Success(_) => Future.successful(Ok(answer.asJson))
      }
    }

  def answerClozeTest(hash: String, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .andThen(ClozeTestAnswerValidator.filter)
    .async(parse.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      getEnrolmentError(hash, user, request).flatMap {
        case Some(error) => Future.successful(error)
        case None =>
          val answerDTO     = request.attrs(ClozeTestAnswerValidator.CLOZE_TEST_ANSWER_KEY)
          val objectVersion = answerDTO.objectVersion.getOrElse(0L)
          getExternalExam(hash, user) match
            case None => Future.successful(Forbidden)
            case Some(ee) =>
              findSectionQuestion(ee, qid) match
                case Left(error) => Future.successful(error)
                case Right((content, esq)) =>
                  val answer = Option(esq.getClozeTestAnswer).getOrElse {
                    val newAnswer = new ClozeTestAnswer()
                    esq.setClozeTestAnswer(newAnswer)
                    newAnswer
                  }

                  // Handle optimistic locking
                  if answer.getObjectVersion > objectVersion then
                    Future.successful(Forbidden("i18n_error_data_has_changed"))
                  else
                    answer.setObjectVersion(objectVersion + 1)
                    answer.setAnswer(answerDTO.answer)

                    Try(ee.serialize(content)) match
                      case scala.util.Failure(_) => Future.successful(InternalServerError)
                      case scala.util.Success(_) =>
                        Future.successful(Ok(answer.asJson(PathProperties.parse("(id, objectVersion, answer)"))))
      }
    }

  private def findSectionQuestion(ee: ExternalExam, qid: Long): Either[Result, (Exam, ExamSectionQuestion)] =
    Try(ee.deserialize()) match
      case scala.util.Failure(_) => Left(InternalServerError)
      case scala.util.Success(content) =>
        findQuestion(qid, content) match
          case None      => Left(Forbidden)
          case Some(esq) => Right((content, esq))

  private def findQuestion(qid: Long, content: Exam): Option[ExamSectionQuestion] =
    content.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(_.getId == qid)

  private def processOptions(oids: List[Long], esq: ExamSectionQuestion, ee: ExternalExam, content: Exam): Result =
    esq.getOptions.asScala.foreach(o => o.setAnswered(oids.contains(o.getId)))
    Try(ee.serialize(content)) match
      case scala.util.Failure(_) => InternalServerError
      case scala.util.Success(_) => Ok

  private def getExternalExam(hash: String, user: User): Option[ExternalExam] =
    DB.find(classOf[ExternalExam])
      .where()
      .eq("hash", hash)
      .eq("creator", user)
      .forUpdate()
      .find

  private def getEnrolment(user: User, prototype: ExternalExam): Option[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    DB.find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("reservation.machine")
      .fetch("reservation.machine.room")
      .where()
      .eq("user.id", user.getId)
      .eq("externalExam.hash", prototype.getHash)
      .le("reservation.startAt", now.toDate)
      .gt("reservation.endAt", now.toDate)
      .eq("reservation.externalUserRef", user.getEppn)
      .find

  private def getEnrolmentError(hash: String, user: User, request: Request[JsValue]) =
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("externalExam.hash", hash)
      .eq("externalExam.creator", user)
      .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString)
      .find match
      case None    => Future.successful(None)
      case Some(e) => validateBasicEnrolment(e, request)

  private def terminateExam(hash: String, newState: Exam.State, user: User): Result =
    DB.find(classOf[ExternalExam])
      .where()
      .eq("hash", hash)
      .eq("creator", user)
      .find match
      case None => Forbidden
      case Some(ee) =>
        getEnrolment(user, ee) match
          case None => Forbidden
          case Some(enrolment) =>
            val now = dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation.getMachine.getRoom)
            ee.setFinished(now)
            Try(ee.deserialize()) match
              case scala.util.Failure(_) => InternalServerError
              case scala.util.Success(content) =>
                if content.getState == Exam.State.STUDENT_STARTED then content.setState(newState)
                Try(ee.serialize(content)) match
                  case scala.util.Failure(_) => InternalServerError
                  case scala.util.Success(_) => Ok
