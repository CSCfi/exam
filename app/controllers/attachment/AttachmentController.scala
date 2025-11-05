// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.attachment

import controllers.base.scala.ExamBaseController
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.file.FileHandler
import miscellaneous.scala.DbApiHelper
import models.assessment.{Comment, LanguageInspection}
import models.attachment.{Attachment, AttachmentContainer}
import models.exam.Exam
import models.questions.{EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Permission, Role}
import org.apache.pekko.stream.scaladsl.{FileIO, Source}
import org.apache.pekko.stream.{IOResult, Materializer}
import org.apache.pekko.util.ByteString
import play.api.libs.Files.TemporaryFile
import play.api.mvc.*
import play.api.mvc.MultipartFormData.FilePart
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext, PermissionFilter}

import java.io.File
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

class AttachmentController @Inject()(
    val controllerComponents: ControllerComponents,
    val authenticated: AuthenticatedAction,
    val configReader: ConfigReader,
    val fileHandler: FileHandler,
    implicit val ec: AuthExecutionContext,
    implicit val mat: Materializer
) extends BaseController
    with ExamBaseController
    with DbApiHelper:

  def addAttachmentToQuestionAnswer(): Action[MultipartFormData[TemporaryFile]] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .async(parse.multipartFormData) { request =>
        parseMultipartForm(request) match
          case None => Future.successful(BadRequest("Invalid form data"))
          case Some((filePart, formData)) =>
            formData.get("questionId").flatMap(_.headOption).map(_.toLong) match
              case None => Future.successful(BadRequest("Missing questionId"))
              case Some(qid) =>
                val user = request.attrs(Auth.ATTR_USER)
                DB.find(classOf[ExamSectionQuestion])
                  .fetch("essayAnswer")
                  .where()
                  .idEq(qid)
                  .eq("examSection.exam.creator", user)
                  .find match
                  case None           => Future.successful(Forbidden)
                  case Some(question) =>
                    // Ensure essay answer exists
                    if Option(question.getEssayAnswer).isEmpty then
                      val answer = new EssayAnswer()
                      question.setEssayAnswer(answer)
                      question.save()

                    Try(
                      copyFile(filePart.ref, "question", qid.toString, "answer", question.getEssayAnswer.getId.toString)
                    ) match
                      case Failure(_) =>
                        Future.successful(InternalServerError("i18n_error_creating_attachment"))
                      case Success(newFilePath) =>
                        val answer = question.getEssayAnswer
                        fileHandler.removePrevious(answer)
                        val attachment = fileHandler.createNew(filePart.filename, filePart.contentType.getOrElse("application/octet-stream"), newFilePath)
                        answer.setAttachment(attachment)
                        answer.save()
                        Future.successful(Ok(answer.asJson))
      }

  def addAttachmentToQuestion(): Action[MultipartFormData[TemporaryFile]] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.multipartFormData) { request =>
        parseMultipartForm(request) match
          case None => Future.successful(BadRequest("Invalid form data"))
          case Some((filePart, formData)) =>
            formData.get("questionId").flatMap(_.headOption).map(_.toLong) match
              case None => Future.successful(BadRequest("Missing questionId"))
              case Some(qid) =>
                DB.find(classOf[Question])
                  .fetch("examSectionQuestions.examSection.exam.parent")
                  .where()
                  .idEq(qid)
                  .find match
                  case None => Future.successful(NotFound)
                  case Some(question) =>
                    Try(copyFile(filePart.ref, "question", qid.toString)) match
                      case Failure(_) =>
                        Future.successful(InternalServerError("i18n_error_creating_attachment"))
                      case Success(newFilePath) =>
                        replaceAndFinish(question, filePart, newFilePath)
      }

  def deleteQuestionAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[Question], id)) match
        case None => NotFound
        case Some(question) =>
          fileHandler.removePrevious(question)
          Ok
    }

  def deleteQuestionAnswerAttachment(qid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT, Role.Name.SUPPORT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val question =
        if user.hasRole(Role.Name.STUDENT) then
          DB.find(classOf[ExamSectionQuestion])
            .where()
            .idEq(qid)
            .eq("examSection.exam.creator", user)
            .find
        else Option(DB.find(classOf[ExamSectionQuestion], qid))

      question match
        case Some(q) if Option(q.getEssayAnswer).exists(a => Option(a.getAttachment).isDefined) =>
          val answer = q.getEssayAnswer
          val aa     = answer.getAttachment
          answer.setAttachment(null)
          answer.save()
          fileHandler.removeAttachmentFile(aa.getFilePath)
          aa.delete()
          Future.successful(Ok(answer.asJson))
        case _ => Future.successful(NotFound)
    }

  def deleteExamAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      Option(DB.find(classOf[Exam], id)) match
        case None => Future.successful(NotFound)
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user) then
            Future.successful(Forbidden("i18n_error_access_forbidden"))
          else
            fileHandler.removePrevious(exam)
            Future.successful(Ok)
    }

  def deleteFeedbackAttachment(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { _ =>
      Option(DB.find(classOf[Exam], id)) match
        case None => Future.successful(NotFound("i18n_exam_not_found"))
        case Some(exam) =>
          Option(exam.getExamFeedback).foreach(fileHandler.removePrevious)
          Future.successful(Ok)
    }

  def deleteStatementAttachment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))
      .async { _ =>
        DB.find(classOf[LanguageInspection]).where().eq("exam.id", id).find match
          case None => Future.successful(NotFound("i18n_exam_not_found"))
          case Some(inspection) =>
            Option(inspection.getStatement).foreach(fileHandler.removePrevious)
            Future.successful(Ok)
      }

  def addAttachmentToExam(): Action[MultipartFormData[TemporaryFile]] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.multipartFormData) { request =>
        parseMultipartForm(request) match
          case None => Future.successful(BadRequest("Invalid form data"))
          case Some((filePart, formData)) =>
            formData.get("examId").flatMap(_.headOption).map(_.toLong) match
              case None => Future.successful(BadRequest("Missing examId"))
              case Some(eid) =>
                Option(DB.find(classOf[Exam], eid)) match
                  case None => Future.successful(NotFound)
                  case Some(exam) =>
                    val user = request.attrs(Auth.ATTR_USER)
                    if !user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user) then
                      Future.successful(Forbidden("i18n_error_access_forbidden"))
                    else
                      Try(copyFile(filePart.ref, "exam", eid.toString)) match
                        case Failure(_) =>
                          Future.successful(InternalServerError("i18n_error_creating_attachment"))
                        case Success(newFilePath) =>
                          replaceAndFinish(exam, filePart, newFilePath)
      }

  def addFeedbackAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.multipartFormData) { request =>
        Option(DB.find(classOf[Exam], id)) match
          case None => Future.successful(NotFound)
          case Some(exam) =>
            if Option(exam.getExamFeedback).isEmpty then
              val comment = new Comment()
              comment.setCreatorWithDate(request.attrs(Auth.ATTR_USER))
              comment.save()
              exam.setExamFeedback(comment)
              exam.update()

            parseMultipartForm(request) match
              case None => Future.successful(BadRequest("Invalid form data"))
              case Some((filePart, _)) =>
                Try(copyFile(filePart.ref, "exam", id.toString, "feedback")) match
                  case Failure(_) =>
                    Future.successful(InternalServerError("i18n_error_creating_attachment"))
                  case Success(newFilePath) =>
                    replaceAndFinish(exam.getExamFeedback, filePart, newFilePath)
      }

  def addStatementAttachment(id: Long): Action[MultipartFormData[TemporaryFile]] =
    authenticated
      .andThen(PermissionFilter(Permission.Type.CAN_INSPECT_LANGUAGE))
      .async(parse.multipartFormData) { request =>
        DB.find(classOf[LanguageInspection]).where().eq("exam.id", id).find match
          case None => Future.successful(NotFound)
          case Some(inspection) =>
            if Option(inspection.getStatement).isEmpty then
              val comment = new Comment()
              comment.setCreatorWithDate(request.attrs(Auth.ATTR_USER))
              comment.save()
              inspection.setStatement(comment)
              inspection.update()

            parseMultipartForm(request) match
              case None => Future.successful(BadRequest("Invalid form data"))
              case Some((filePart, _)) =>
                Try(copyFile(filePart.ref, "exam", id.toString, "inspectionstatement")) match
                  case Failure(_) =>
                    Future.successful(InternalServerError("i18n_error_creating_attachment"))
                  case Success(newFilePath) =>
                    replaceAndFinish(inspection.getStatement, filePart, newFilePath)
      }

  def downloadQuestionAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val question =
        if user.hasRole(Role.Name.STUDENT) then
          DB.find(classOf[Question])
            .where()
            .idEq(id)
            .eq("examSectionQuestions.examSection.exam.creator", user)
            .find
        else Option(DB.find(classOf[Question], id))

      question match
        case Some(q) if Option(q.getAttachment).isDefined =>
          serveAttachment(q.getAttachment)
        case _ => Future.successful(NotFound)
    }

  def downloadQuestionAnswerAttachment(qid: Long): Action[AnyContent] =
    authenticated.async { request =>
      getExamSectionQuestion(request, qid) match
        case Some(q) if Option(q.getEssayAnswer).exists(a => Option(a.getAttachment).isDefined) =>
          serveAttachment(q.getEssayAnswer.getAttachment)
        case _ => Future.successful(NotFound)
    }

  def downloadExamAttachment(id: Long): Action[AnyContent] =
    authenticated.async { _ =>
      Option(DB.find(classOf[Exam], id)) match
        case Some(exam) if Option(exam.getAttachment).isDefined =>
          serveAttachment(exam.getAttachment)
        case _ => Future.successful(NotFound)
    }

  def downloadFeedbackAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val exam =
        if user.hasRole(Role.Name.STUDENT) then DB.find(classOf[Exam]).where().idEq(id).eq("creator", user).find
        else Option(DB.find(classOf[Exam], id))

      exam match
        case Some(e) if Option(e.getExamFeedback).exists(f => Option(f.getAttachment).isDefined) =>
          serveAttachment(e.getExamFeedback.getAttachment)
        case _ => Future.successful(NotFound)
    }

  def downloadStatementAttachment(id: Long): Action[AnyContent] =
    authenticated.async { request =>
      val user  = request.attrs(Auth.ATTR_USER)
      val query = DB.find(classOf[Exam]).where().idEq(id).isNotNull("languageInspection.statement.attachment")
      val exam =
        if user.hasRole(Role.Name.STUDENT) then query.eq("creator", user).find
        else query.find

      exam match
        case Some(e) => serveAttachment(e.getLanguageInspection.getStatement.getAttachment)
        case None    => Future.successful(NotFound)
    }

  // Helper methods
  private def replaceAndFinish(
      ac: AttachmentContainer,
      fp: FilePart[TemporaryFile],
      path: String
  ): Future[Result] =
    Future {
      fileHandler.removePrevious(ac)
      val attachment = fileHandler.createNew(fp.filename, fp.contentType.getOrElse("application/octet-stream"), path)
      ac.setAttachment(attachment)
      ac.save()
      Ok(attachment.asJson)
    }

  private def serveAttachment(attachment: Attachment): Future[Result] =
    val file = new File(attachment.getFilePath)
    if !file.exists() then Future.successful(InternalServerError("i18n_file_not_found_but_referred_in_database"))
    else
      val source: Source[ByteString, Future[IOResult]] = FileIO.fromPath(file.toPath)
      serveAsBase64Stream(attachment, source)

  private def serveAsBase64Stream(
      attachment: Attachment,
      source: Source[ByteString, Future[IOResult]]
  ): Future[Result] =
    // Convert to base64 and stream
    source
      .map(_.encodeBase64)
      .runFold(ByteString.empty)(_ ++ _)
      .map { base64Data =>
        Ok(base64Data.utf8String)
          .withHeaders(
            "Content-Disposition" -> s"attachment; filename=\"${attachment.getFileName}\"",
            "Content-Type"        -> "application/octet-stream"
          )
      }

  private def getExamSectionQuestion(request: Request[?], id: Long): Option[ExamSectionQuestion] =
    val user = request.attrs(Auth.ATTR_USER)
    if user.hasRole(Role.Name.STUDENT) then
      DB.find(classOf[ExamSectionQuestion]).where().idEq(id).eq("examSection.exam.creator", user).find
    else Option(DB.find(classOf[ExamSectionQuestion], id))

  private def copyFile(srcFile: TemporaryFile, pathParams: String*): String =
    val newFilePath = fileHandler.createFilePath(pathParams*)
    fileHandler.copyFile(srcFile, new File(newFilePath))
    newFilePath

  private def parseMultipartForm(
      request: Request[MultipartFormData[TemporaryFile]]
  ): Option[(FilePart[TemporaryFile], Map[String, Seq[String]])] =
    request.body.file("file").map { filePart =>
      (filePart, request.body.dataParts)
    }
