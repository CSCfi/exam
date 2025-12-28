// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import models.attachment.{Attachment, AttachmentContainer}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.questions.EssayAnswer
import models.sections.ExamSectionQuestion
import models.user.User
import play.api.Logging
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

/** Service for collaborative exam attachment operations
  *
  * Handles attachment management for collaborative exams.
  */
class CollaborativeAttachmentService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    private val ec: BlockingIOExecutionContext
) extends Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Get exam for attachment operations
    *
    * @param examId
    *   the collaborative exam ID
    * @return
    *   Future containing Either[error message, (CollaborativeExam, Exam)]
    */
  private def getExamForAttachment(examId: Long)
      : Future[Either[String, (CollaborativeExam, Exam)]] =
    collaborativeExamService.findById(examId).flatMap {
      case None => Future.successful(Left("i18n_error_exam_not_found"))
      case Some(ce) =>
        examLoader.downloadExam(ce).map {
          case None       => Left("i18n_error_exam_not_found")
          case Some(exam) => Right((ce, exam))
        }
    }

  /** Find a section question in an exam
    *
    * @param questionId
    *   the question ID
    * @param exam
    *   the exam
    * @return
    *   Some(ExamSectionQuestion) if found, None otherwise
    */
  private def findSectionQuestion(questionId: Long, exam: Exam): Option[ExamSectionQuestion] =
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(_.getId == questionId)

  /** Find essay answer with attachment
    *
    * @param esq
    *   the exam section question
    * @return
    *   Some(EssayAnswer) if found with attachment, None otherwise
    */
  def findEssayAnswerWithAttachment(esq: ExamSectionQuestion): Option[EssayAnswer] =
    Option(esq.getEssayAnswer) match
      case Some(ea)
          if Option(ea.getAttachment)
            .flatMap(a => Option(a.getExternalId))
            .exists(_.nonEmpty) =>
        Some(ea)
      case _ => None

  /** Upload attachment to external system and update exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param questionId
    *   the question ID (if attaching to question)
    * @param userId
    *   the user ID
    * @param container
    *   the attachment container
    * @param attachmentData
    *   tuple of (externalId, mimeType, displayName) from external system
    * @return
    *   Future containing Either[error message, Attachment]
    */
  def uploadAttachmentToExam(
      examId: Long,
      questionId: Option[Long],
      userId: Long,
      container: AttachmentContainer,
      attachmentData: (String, String, String)
  ): Future[Either[String, Attachment]] =
    val (externalId, mimeType, displayName) = attachmentData

    getExamForAttachment(examId).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right((ce, exam)) =>
        val user = io.ebean.DB.find(classOf[User], userId)

        // Find the container if questionId is provided
        val targetContainer = questionId match
          case Some(qid) =>
            findSectionQuestion(qid, exam).map(_.getQuestion).getOrElse(container)
          case None => container

        val attachment = new Attachment()
        attachment.setExternalId(externalId)
        attachment.setMimeType(mimeType)
        attachment.setFileName(displayName)
        targetContainer.setAttachment(attachment)

        examLoader.uploadExam(ce, exam, user).map { result =>
          if result.header.status == play.api.mvc.Results.Ok.header.status then
            Right(attachment)
          else Left("Failed to upload exam")
        }
    }

  /** Delete attachment from exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param questionId
    *   the question ID (if deleting from question)
    * @param userId
    *   the user ID
    * @param container
    *   the attachment container
    * @return
    *   Future containing Either[error message, Unit]
    */
  def deleteAttachmentFromExam(
      examId: Long,
      questionId: Option[Long],
      userId: Long,
      container: AttachmentContainer
  ): Future[Either[String, Unit]] =
    getExamForAttachment(examId).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right((ce, exam)) =>
        val user = io.ebean.DB.find(classOf[User], userId)

        // Find the container if questionId is provided
        val targetContainer = questionId match
          case Some(qid) =>
            findSectionQuestion(qid, exam).map(_.getQuestion).getOrElse(container)
          case None => container

        targetContainer.setAttachment(null)

        examLoader.uploadExam(ce, exam, user).map { result =>
          if result.header.status == play.api.mvc.Results.Ok.header.status then Right(())
          else Left("Failed to upload exam")
        }
    }

  /** Get attachment from exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param questionId
    *   optional question ID
    * @return
    *   Future containing Either[error message, Attachment]
    */
  def getAttachmentFromExam(
      examId: Long,
      questionId: Option[Long]
  ): Future[Either[String, Attachment]] =
    getExamForAttachment(examId).map {
      case Left(error) => Left(error)
      case Right((_, exam)) =>
        questionId match
          case Some(qid) =>
            findSectionQuestion(qid, exam)
              .map(_.getQuestion.getAttachment)
              .filter(_ != null) match
              case Some(att) => Right(att)
              case None      => Left("i18n_error_not_found")
          case None =>
            Option(exam.getAttachment) match
              case Some(att) => Right(att)
              case None      => Left("i18n_error_not_found")
    }
