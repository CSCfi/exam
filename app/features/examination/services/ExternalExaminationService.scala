// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import ExternalExaminationError._
import features.examination.EnrolmentValidator
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.iop.ExternalExam
import models.questions.{ClozeTestAnswer, EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.User
import org.joda.time.DateTime
import play.api.{Environment, Logging}
import services.config.ByodConfigHandler
import services.datetime.DateTimeHandler
import validation.answer.{ClozeTestAnswerDTO, EssayAnswerDTO}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.Try

class ExternalExaminationService @Inject() (
    private val dateTimeHandler: DateTimeHandler,
    private val byodConfigHandler: ByodConfigHandler,
    override protected val environment: Environment,
    implicit private val ec: ExecutionContext
) extends EnrolmentValidator
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def startExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, Exam]] =
    getExternalExam(hash, user)
      .fold(Future.successful(Left(ExternalExamNotFound): Either[ExternalExaminationError, Exam])) {
        externalExam =>
          getEnrolment(user, externalExam)
            .fold(Future.successful(Left(EnrolmentNotFound): Either[
              ExternalExaminationError,
              Exam
            ])) { enrolment =>
              Try(externalExam.deserialize())
                .fold(
                  _ => Future.successful(Left(DeserializationFailed)),
                  newExam =>
                    validateBasicEnrolment(enrolment, requestData).map {
                      case Some(error) => Left(ValidationError(error.header.status.toString))
                      case None =>
                        if newExam.getState == Exam.State.PUBLISHED then
                          startExternalExam(externalExam, newExam, enrolment)
                        else
                          processExamForResponse(newExam)
                          Right(newExam)
                    }
                )
            }
      }

  def turnExam(hash: String, user: User): Either[ExternalExaminationError, Unit] =
    terminateExam(hash, Exam.State.REVIEW, user).map(_ => ())

  def abortExam(hash: String, user: User): Either[ExternalExaminationError, Unit] =
    terminateExam(hash, Exam.State.ABORTED, user).map(_ => ())

  def answerMultiChoice(
      hash: String,
      questionId: Long,
      user: User,
      optionIds: Seq[Long],
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, Unit]] =
    validateEnrolment(hash, user, requestData).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        getExternalExam(hash, user)
          .fold(Future.successful(Left(ExternalExamNotFound): Either[
            ExternalExaminationError,
            Unit
          ])) { ee =>
            findSectionQuestion(ee, questionId) match
              case Left(error) => Future.successful(Left(error))
              case Right((content, esq)) =>
                processOptions(optionIds.toList, esq, ee, content)
          }
    }

  def answerEssay(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: EssayAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, EssayAnswer]] =
    validateEnrolment(hash, user, requestData).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        getExternalExam(hash, user)
          .fold(Future.successful(Left(ExternalExamNotFound): Either[
            ExternalExaminationError,
            EssayAnswer
          ])) { ee =>
            Try(ee.deserialize())
              .fold(
                _ => Future.successful(Left(DeserializationFailed)),
                content =>
                  findQuestion(questionId, content)
                    .fold(Future.successful(Left(QuestionNotFound): Either[
                      ExternalExaminationError,
                      EssayAnswer
                    ])) {
                      question =>
                        val answer = Option(question.getEssayAnswer).getOrElse(new EssayAnswer())
                        // Handle optimistic locking
                        val hasVersionConflict = answerDTO.objectVersion match
                          case Some(ov) if answer.getObjectVersion > ov => true
                          case Some(ov) =>
                            answer.setObjectVersion(ov + 1)
                            false
                          case None => false
                        if hasVersionConflict then Future.successful(Left(VersionConflict))
                        else
                          answer.setAnswer(answerDTO.answer)
                          question.setEssayAnswer(answer)
                          Try(ee.serialize(content))
                            .fold(
                              _ => Future.successful(Left(SerializationFailed)),
                              _ => Future.successful(Right(answer))
                            )
                    }
              )
          }
    }

  def answerClozeTest(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: ClozeTestAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, ClozeTestAnswer]] =
    validateEnrolment(hash, user, requestData).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right(_) =>
        val objectVersion = answerDTO.objectVersion.getOrElse(0L)
        getExternalExam(hash, user)
          .fold(Future.successful(Left(ExternalExamNotFound): Either[
            ExternalExaminationError,
            ClozeTestAnswer
          ])) {
            ee =>
              findSectionQuestion(ee, questionId) match
                case Left(error) => Future.successful(Left(error))
                case Right((content, esq)) =>
                  val answer = Option(esq.getClozeTestAnswer).getOrElse {
                    val newAnswer = new ClozeTestAnswer()
                    esq.setClozeTestAnswer(newAnswer)
                    newAnswer
                  }
                  // Handle optimistic locking
                  if answer.getObjectVersion > objectVersion then
                    Future.successful(Left(VersionConflict))
                  else
                    answer.setObjectVersion(objectVersion + 1)
                    answer.setAnswer(answerDTO.answer)
                    Try(ee.serialize(content))
                      .fold(
                        _ => Future.successful(Left(SerializationFailed)),
                        _ => Future.successful(Right(answer))
                      )
          }
    }

  // Private helper methods

  private def startExternalExam(
      externalExam: ExternalExam,
      newExam: Exam,
      enrolment: ExamEnrolment
  ): Either[ExternalExaminationError, Exam] =
    newExam.setState(Exam.State.STUDENT_STARTED)
    Try(externalExam.serialize(newExam))
      .fold(
        _ => Left(SerializationFailed),
        _ =>
          val now = dateTimeHandler.adjustDST(
            DateTime.now(),
            enrolment.getReservation.getMachine.getRoom
          )
          externalExam.setStarted(now)
          externalExam.update()
          processExamForResponse(newExam)
          Right(newExam)
      )

  private def processExamForResponse(exam: Exam): Unit =
    exam.setCloned(false)
    exam.setExternal(true)
    exam.setDerivedMaxScores()
    processClozeTestQuestions(exam)

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

  private def findSectionQuestion(
      ee: ExternalExam,
      qid: Long
  ): Either[ExternalExaminationError, (Exam, ExamSectionQuestion)] =
    Try(ee.deserialize())
      .fold(
        _ => Left(DeserializationFailed),
        content =>
          findQuestion(qid, content)
            .fold(Left(QuestionNotFound): Either[
              ExternalExaminationError,
              (Exam, ExamSectionQuestion)
            ]) { esq =>
              Right((content, esq))
            }
      )

  private def findQuestion(qid: Long, content: Exam): Option[ExamSectionQuestion] =
    content.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(_.getId == qid)

  private def processOptions(
      oids: List[Long],
      esq: ExamSectionQuestion,
      ee: ExternalExam,
      content: Exam
  ): Future[Either[ExternalExaminationError, Unit]] =
    esq.getOptions.asScala.foreach(o => o.setAnswered(oids.contains(o.getId)))
    Try(ee.serialize(content))
      .fold(
        _ => Future.successful(Left(SerializationFailed)),
        _ => Future.successful(Right(()))
      )

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

  private def validateEnrolment(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, Unit]] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq("externalExam.hash", hash)
      .eq("externalExam.creator", user)
      .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString)
      .find match
      case None => Future.successful(Left(EnrolmentNotFound))
      case Some(e) =>
        validateBasicEnrolment(e, requestData).map {
          case Some(error) => Left(ValidationError(error.header.status.toString))
          case None        => Right(())
        }

  private def terminateExam(
      hash: String,
      newState: Exam.State,
      user: User
  ): Either[ExternalExaminationError, Unit] =
    DB.find(classOf[ExternalExam])
      .where()
      .eq("hash", hash)
      .eq("creator", user)
      .find match
      case None => Left(ExternalExamNotFound)
      case Some(ee) =>
        getEnrolment(user, ee) match
          case None => Left(EnrolmentNotFound)
          case Some(enrolment) =>
            val now =
              dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation.getMachine.getRoom)
            ee.setFinished(now)
            Try(ee.deserialize())
              .fold(
                _ => Left(DeserializationFailed),
                content =>
                  if content.getState == Exam.State.STUDENT_STARTED then content.setState(newState)
                  Try(ee.serialize(content))
                    .fold(
                      _ => Left(SerializationFailed),
                      _ => Right(())
                    )
              )
