// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.attachment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.assessment.{Comment, LanguageInspection}
import models.attachment.{Attachment, AttachmentContainer}
import models.exam.Exam
import models.questions.{EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Role, User}
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.stream.{IOResult, Materializer}
import org.apache.pekko.util.ByteString
import play.api.libs.Files.TemporaryFile
import play.api.mvc.MultipartFormData.FilePart
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.file.FileHandler

import java.io.File
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class AttachmentService @Inject() (
    private val configReader: ConfigReader,
    private val fileHandler: FileHandler,
    implicit private val ec: BlockingIOExecutionContext,
    implicit private val mat: Materializer
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  def addAttachmentToQuestionAnswer(
      questionId: Long,
      filePart: FilePart[TemporaryFile],
      user: User
  ): Future[Either[String, EssayAnswer]] =
    DB.find(classOf[ExamSectionQuestion])
      .fetch("essayAnswer")
      .where()
      .idEq(questionId)
      .eq("examSection.exam.creator", user)
      .find match
      case None           => Future.successful(Left("Forbidden"))
      case Some(question) =>
        // Ensure essay answer exists
        if Option(question.essayAnswer).isEmpty then
          val answer = new EssayAnswer()
          question.essayAnswer = answer
          question.save()

        Try(
          copyFile(
            filePart.ref,
            "question",
            questionId.toString,
            "answer",
            question.essayAnswer.id.toString
          )
        ) match
          case Failure(_) => Future.successful(Left("i18n_error_creating_attachment"))
          case Success(newFilePath) =>
            Future {
              val answer = question.essayAnswer
              fileHandler.removePrevious(answer)
              val attachment = fileHandler.createNew(
                filePart.filename,
                filePart.contentType.getOrElse("application/octet-stream"),
                newFilePath
              )
              answer.attachment = attachment
              answer.save()
              Right(answer)
            }

  def addAttachmentToQuestion(
      questionId: Long,
      filePart: FilePart[TemporaryFile]
  ): Future[Either[String, Question]] =
    DB.find(classOf[Question])
      .fetch("examSectionQuestions.examSection.exam.parent")
      .where()
      .idEq(questionId)
      .find match
      case None => Future.successful(Left("NotFound"))
      case Some(question) =>
        Try(copyFile(filePart.ref, "question", questionId.toString)) match
          case Failure(_) => Future.successful(Left("i18n_error_creating_attachment"))
          case Success(newFilePath) =>
            replaceAndFinish(question, filePart, newFilePath).map {
              case attachment if Option(attachment).isDefined => Right(question)
              case _ => Left("i18n_error_creating_attachment")
            }

  def deleteQuestionAttachment(questionId: Long): Either[String, Unit] =
    Option(DB.find(classOf[Question], questionId)) match
      case None => Left("NotFound")
      case Some(question) =>
        fileHandler.removePrevious(question)
        Right(())

  def deleteQuestionAnswerAttachment(
      questionId: Long,
      user: User
  ): Future[Either[String, EssayAnswer]] =
    val question =
      if user.hasRole(Role.Name.STUDENT) then
        DB.find(classOf[ExamSectionQuestion])
          .where()
          .idEq(questionId)
          .eq("examSection.exam.creator", user)
          .find
      else Option(DB.find(classOf[ExamSectionQuestion], questionId))

    question match
      case Some(q) if Option(q.essayAnswer).exists(a => Option(a.attachment).isDefined) =>
        Future {
          val answer = q.essayAnswer
          val aa     = answer.attachment
          answer.attachment = null
          answer.save()
          fileHandler.removeAttachmentFile(aa.filePath)
          aa.delete()
          Right(answer)
        }
      case _ => Future.successful(Left("NotFound"))

  def deleteExamAttachment(examId: Long, user: User): Future[Either[String, Unit]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Future.successful(Left("NotFound"))
      case Some(exam) =>
        if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then
          Future.successful(Left("i18n_error_access_forbidden"))
        else
          Future {
            fileHandler.removePrevious(exam)
            Right(())
          }

  def deleteFeedbackAttachment(examId: Long): Future[Either[String, Unit]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Future.successful(Left("NotFound"))
      case Some(exam) =>
        Future {
          Option(exam.examFeedback).foreach(fileHandler.removePrevious)
          Right(())
        }

  def deleteStatementAttachment(examId: Long): Future[Either[String, Unit]] =
    DB.find(classOf[LanguageInspection]).where().eq("exam.id", examId).find match
      case None => Future.successful(Left("NotFound"))
      case Some(inspection) =>
        Future {
          Option(inspection.statement).foreach(fileHandler.removePrevious)
          Right(())
        }

  def addAttachmentToExam(
      examId: Long,
      filePart: FilePart[TemporaryFile],
      user: User
  ): Future[Either[String, Exam]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Future.successful(Left("NotFound"))
      case Some(exam) =>
        if !user.isAdminOrSupport && !exam.isOwnedOrCreatedBy(user) then
          Future.successful(Left("i18n_error_access_forbidden"))
        else
          Try(copyFile(filePart.ref, "exam", examId.toString)) match
            case Failure(_) => Future.successful(Left("i18n_error_creating_attachment"))
            case Success(newFilePath) =>
              replaceAndFinish(exam, filePart, newFilePath).map(_ => Right(exam))

  def addFeedbackAttachment(
      examId: Long,
      filePart: FilePart[TemporaryFile],
      user: User
  ): Future[Either[String, Comment]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Future.successful(Left("NotFound"))
      case Some(exam) =>
        if Option(exam.examFeedback).isEmpty then
          val comment = new Comment()
          comment.setCreatorWithDate(user)
          comment.save()
          exam.examFeedback = comment
          exam.update()

        Try(copyFile(filePart.ref, "exam", examId.toString, "feedback")) match
          case Failure(_) => Future.successful(Left("i18n_error_creating_attachment"))
          case Success(newFilePath) =>
            replaceAndFinish(exam.examFeedback, filePart, newFilePath).map(_ =>
              Right(exam.examFeedback)
            )

  def addStatementAttachment(
      examId: Long,
      filePart: FilePart[TemporaryFile],
      user: User
  ): Future[Either[String, Comment]] =
    DB.find(classOf[LanguageInspection]).where().eq("exam.id", examId).find match
      case None => Future.successful(Left("NotFound"))
      case Some(inspection) =>
        if Option(inspection.statement).isEmpty then
          val comment = new Comment()
          comment.setCreatorWithDate(user)
          comment.save()
          inspection.statement = comment
          inspection.update()

        Try(copyFile(filePart.ref, "exam", examId.toString, "inspectionstatement")) match
          case Failure(_) => Future.successful(Left("i18n_error_creating_attachment"))
          case Success(newFilePath) =>
            replaceAndFinish(inspection.statement, filePart, newFilePath).map(_ =>
              Right(inspection.statement)
            )

  def downloadQuestionAttachment(questionId: Long, user: User): Future[Either[String, Attachment]] =
    val question =
      if user.hasRole(Role.Name.STUDENT) then
        DB.find(classOf[Question])
          .where()
          .idEq(questionId)
          .eq("examSectionQuestions.examSection.exam.creator", user)
          .find
      else Option(DB.find(classOf[Question], questionId))

    question match
      case Some(q) if Option(q.attachment).isDefined => Future.successful(Right(q.attachment))
      case _                                         => Future.successful(Left("NotFound"))

  def downloadQuestionAnswerAttachment(
      questionId: Long,
      user: User
  ): Future[Either[String, Attachment]] =
    getExamSectionQuestion(questionId, user) match
      case Some(q) if Option(q.essayAnswer).exists(a => Option(a.attachment).isDefined) =>
        Future.successful(Right(q.essayAnswer.attachment))
      case _ => Future.successful(Left("NotFound"))

  def downloadExamAttachment(examId: Long): Future[Either[String, Attachment]] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) if Option(exam.attachment).isDefined =>
        Future.successful(Right(exam.attachment))
      case _ => Future.successful(Left("NotFound"))

  def downloadFeedbackAttachment(examId: Long, user: User): Future[Either[String, Attachment]] =
    val exam =
      if user.hasRole(Role.Name.STUDENT) then
        DB.find(classOf[Exam]).where().idEq(examId).eq("creator", user).find
      else Option(DB.find(classOf[Exam], examId))

    exam match
      case Some(e) if Option(e.examFeedback).exists(f => Option(f.attachment).isDefined) =>
        Future.successful(Right(e.examFeedback.attachment))
      case _ => Future.successful(Left("NotFound"))

  def downloadStatementAttachment(examId: Long, user: User): Future[Either[String, Attachment]] =
    val query = DB.find(classOf[Exam]).where().idEq(examId).isNotNull(
      "languageInspection.statement.attachment"
    )
    val exam =
      if user.hasRole(Role.Name.STUDENT) then query.eq("creator", user).find
      else query.find

    exam match
      case Some(e) => Future.successful(Right(e.languageInspection.statement.attachment))
      case None    => Future.successful(Left("NotFound"))

  def serveAttachment(attachment: Attachment)
      : Future[Either[String, Source[ByteString, Future[IOResult]]]] =
    val file = new File(attachment.filePath)
    if !file.exists() then Future.successful(Left("i18n_file_not_found_but_referred_in_database"))
    else
      val source: Source[ByteString, Future[IOResult]] = FileIO.fromPath(file.toPath)
      Future.successful(Right(source))

  private def replaceAndFinish(
      ac: AttachmentContainer,
      fp: FilePart[TemporaryFile],
      path: String
  ): Future[Attachment] =
    Future {
      fileHandler.removePrevious(ac)
      val attachment = fileHandler.createNew(
        fp.filename,
        fp.contentType.getOrElse("application/octet-stream"),
        path
      )
      ac.attachment = attachment
      ac.save()
      attachment
    }

  private def getExamSectionQuestion(questionId: Long, user: User): Option[ExamSectionQuestion] =
    if user.hasRole(Role.Name.STUDENT) then
      DB.find(classOf[ExamSectionQuestion]).where().idEq(questionId).eq(
        "examSection.exam.creator",
        user
      ).find
    else Option(DB.find(classOf[ExamSectionQuestion], questionId))

  private def copyFile(srcFile: TemporaryFile, pathParams: String*): String =
    val newFilePath = fileHandler.createFilePath(pathParams*)
    fileHandler.copyFile(srcFile, new File(newFilePath))
    newFilePath
