// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

import database.EbeanPaths.path
import database.EbeanTransactions.commitOnRight
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.examination.EnrolmentValidator
import features.examination.services.ExternalExaminationError.*
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.exam.ExamState
import models.iop.ExternalExam
import models.questions.QuestionType
import models.questions.{ClozeTestAnswer, EssayAnswer}
import models.sections.ExamSectionQuestion
import models.user.User
import play.api.{Environment, Logging}
import security.BlockingIOExecutionContext
import services.config.ByodConfigHandler
import services.datetime.AppClock
import validation.answer.{ClozeTestAnswerDTO, EssayAnswerDTO}

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ExternalExaminationService @Inject() (
    private val byodConfigHandler: ByodConfigHandler,
    override protected val environment: Environment,
    private val clock: AppClock,
    implicit private val ec: BlockingIOExecutionContext
) extends EnrolmentValidator
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def startExam(
      hash: String,
      user: User,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, Exam]] =
    Future(commitOnRight {
      for
        externalExam <- lockExternalExam(hash, user).toRight(ExternalExamNotFound)
        enrolment    <- getEnrolment(user, externalExam).toRight(EnrolmentNotFound)
        _            <- validate(enrolment, requestData)
        exam         <- deserialize(externalExam)
        _ <-
          if exam.state == ExamState.PUBLISHED then startExternalExam(externalExam, exam)
          else Right(())
      yield
        processExamForResponse(exam)
        exam
    })

  def turnExam(hash: String, user: User): Either[ExternalExaminationError, Unit] =
    terminateExam(hash, ExamState.REVIEW, user)

  def abortExam(hash: String, user: User): Either[ExternalExaminationError, Unit] =
    terminateExam(hash, ExamState.ABORTED, user)

  def answerMultiChoice(
      hash: String,
      questionId: Long,
      user: User,
      optionIds: Seq[Long],
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, Unit]] =
    withQuestion(hash, user, questionId, requestData) { (ee, content, esq) =>
      esq.options.asScala.foreach(o => o.answered = optionIds.contains(o.id))
      serialize(ee, content)
    }

  def answerEssay(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: EssayAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, EssayAnswer]] =
    withQuestion(hash, user, questionId, requestData) { (ee, content, esq) =>
      val answer = Option(esq.essayAnswer).getOrElse(new EssayAnswer())
      // Handle optimistic locking
      answerDTO.objectVersion match
        case Some(ov) if answer.objectVersion > ov => Left(VersionConflict)
        case ov =>
          ov.foreach(v => answer.objectVersion = v + 1)
          answer.answer = answerDTO.answer
          esq.essayAnswer = answer
          serialize(ee, content).map(_ => answer)
    }

  def answerClozeTest(
      hash: String,
      questionId: Long,
      user: User,
      answerDTO: ClozeTestAnswerDTO,
      requestData: RequestData
  ): Future[Either[ExternalExaminationError, ClozeTestAnswer]] =
    val objectVersion = answerDTO.objectVersion.getOrElse(0L)
    withQuestion(hash, user, questionId, requestData) { (ee, content, esq) =>
      val answer = Option(esq.clozeTestAnswer).getOrElse {
        val newAnswer = new ClozeTestAnswer()
        esq.clozeTestAnswer = newAnswer
        newAnswer
      }
      // Handle optimistic locking
      if answer.objectVersion > objectVersion then Left(VersionConflict)
      else
        answer.objectVersion = objectVersion + 1
        answer.answer = answerDTO.answer
        serialize(ee, content).map(_ => answer)
    }

  // Private helper methods

  // `started` is saved by the update in serialize
  private def startExternalExam(
      externalExam: ExternalExam,
      exam: Exam
  ): Either[ExternalExaminationError, Unit] =
    exam.state = ExamState.STUDENT_STARTED
    externalExam.started = clock.now()
    serialize(externalExam, exam)

  private def processExamForResponse(exam: Exam): Unit =
    exam.cloned = false
    exam.external = true
    exam.setDerivedMaxScores()
    processClozeTestQuestions(exam)

  private def processClozeTestQuestions(exam: Exam): Unit =
    val clozeTestQuestions = exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(_.question.`type` == QuestionType.ClozeTestQuestion)
      .toList

    val questionsToHide = clozeTestQuestions.map { esq =>
      val answer = Option(esq.clozeTestAnswer).getOrElse(new ClozeTestAnswer())
      answer.setQuestion(esq)
      esq.clozeTestAnswer = answer
      esq.question
    }.toSet
    questionsToHide.foreach(_.question = null)

  /** Validates the ongoing enrolment, then runs `f` on the question from the exam content. `f` must
    * serialize the content back to `ee` if it changes it.
    */
  private def withQuestion[A](
      hash: String,
      user: User,
      qid: Long,
      requestData: RequestData
  )(
      f: (ExternalExam, Exam, ExamSectionQuestion) => Either[ExternalExaminationError, A]
  ): Future[Either[ExternalExaminationError, A]] =
    Future(commitOnRight {
      for
        ee      <- lockExternalExam(hash, user).toRight(ExternalExamNotFound)
        _       <- validateEnrolment(ee, requestData)
        content <- deserialize(ee)
        esq     <- findQuestion(qid, content).toRight(QuestionNotFound)
        result  <- f(ee, content, esq)
      yield result
    })

  private def findQuestion(qid: Long, content: Exam): Option[ExamSectionQuestion] =
    content.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .find(_.id == qid)

  // The content is Jackson (de)serialized
  private def deserialize(ee: ExternalExam): Either[ExternalExaminationError, Exam] =
    Try(ee.deserialize).toEither.left.map(_ => DeserializationFailed)

  private def serialize(ee: ExternalExam, content: Exam): Either[ExternalExaminationError, Unit] =
    Try(ee.serialize(content)).toEither.left.map(_ => SerializationFailed).map(_ => ())

  /** The content is read, changed and written back as a whole, so each request locks the row until
    * its transaction ends. Otherwise two concurrent saves of the same student (e.g. autosaves of
    * two questions) would each overwrite the answer the other one saved. Call in commitOnRight.
    */
  private def lockExternalExam(hash: String, user: User): Option[ExternalExam] =
    DB.find(classOf[ExternalExam])
      .where()
      .eq(path[ExternalExam]("hash"), hash)
      .eq(path[ExternalExam]("creator"), user)
      .forUpdate()
      .find

  private def getEnrolment(user: User, prototype: ExternalExam): Option[ExamEnrolment] =
    val now = clock.now()
    DB.find(classOf[ExamEnrolment])
      .fetch(path[ExamEnrolment]("reservation"))
      .fetch(path[ExamEnrolment]("reservation.machine"))
      .fetch(path[ExamEnrolment]("reservation.machine.room"))
      .where()
      .eq(path[ExamEnrolment]("user.id"), user.id)
      .eq(path[ExamEnrolment]("externalExam.hash"), prototype.hash)
      .le(path[ExamEnrolment]("reservation.startAt"), now)
      .gt(path[ExamEnrolment]("reservation.endAt"), now)
      .eq(path[ExamEnrolment]("reservation.externalUserRef"), user.eppn)
      .find

  private def validateEnrolment(
      ee: ExternalExam,
      requestData: RequestData
  ): Either[ExternalExaminationError, Unit] =
    DB.find(classOf[ExamEnrolment])
      .where()
      .eq(path[ExamEnrolment]("externalExam.id"), ee.id)
      .jsonEqualTo(
        path[ExamEnrolment]("externalExam.content"),
        "state",
        ExamState.STUDENT_STARTED.toString
      )
      .find
      .toRight(EnrolmentNotFound)
      .flatMap(validate(_, requestData))

  private def validate(
      enrolment: ExamEnrolment,
      requestData: RequestData
  ): Either[ExternalExaminationError, Unit] =
    validateBasicEnrolment(enrolment, requestData).left.map(ValidationError(_))

  private def terminateExam(
      hash: String,
      newState: Exam.State,
      user: User
  ): Either[ExternalExaminationError, Unit] =
    commitOnRight {
      for
        ee      <- lockExternalExam(hash, user).toRight(ExternalExamNotFound)
        _       <- getEnrolment(user, ee).toRight(EnrolmentNotFound)
        content <- deserialize(ee)
        _ = if content.state == ExamState.STUDENT_STARTED then content.state = newState
        // `finished` is saved by the update in serialize
        _ = ee.finished = clock.now()
        _ <- serialize(ee, content)
      yield ()
    }
