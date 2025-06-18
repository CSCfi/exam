// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import io.ebean.DB
import miscellaneous.csv.CsvBuilder
import miscellaneous.file.FileHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.Exam
import models.questions.Question
import models.user.Role
import org.apache.commons.compress.archivers.tar.{TarArchiveEntry, TarArchiveOutputStream}
import org.apache.commons.io.IOUtils
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import org.jsoup.Jsoup
import play.api.Logging
import play.api.libs.Files
import play.api.mvc._
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}

import java.io._
import java.text.SimpleDateFormat
import java.util.Base64
import java.util.zip.GZIPOutputStream
import javax.inject.Inject
import scala.collection.mutable
import scala.jdk.CollectionConverters._
import scala.util.Using

class ReviewDocumentsController @Inject() (
    val controllerComponents: ControllerComponents,
    csvBuilder: CsvBuilder,
    fileHandler: FileHandler,
    authenticated: AuthenticatedAction,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with JavaApiHelper
    with DbApiHelper
    with Logging:

  def importGrades: Action[MultipartFormData[Files.TemporaryFile]] =
    authenticated(parse.multipartFormData)
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
        request.body.file("file") match
          case Some(file) =>
            val user = request.attrs(Auth.ATTR_USER)
            val role = if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then Role.Name.ADMIN else Role.Name.TEACHER
            try csvBuilder.parseGrades(file.ref.toFile, user, role)
            catch
              case e: Exception =>
                logger.error("Failed to parse CSV file. Stack trace follows", e)
                InternalServerError("i18n_internal_error")
            Ok
          case None => NotFound
      }

  def getArchivedAttachments(
      eid: Long,
      start: Option[String],
      end: Option[String]
  ): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      DB.find(classOf[Exam]).where().idEq(eid).find match
        case Some(exam) =>
          val df = new SimpleDateFormat("dd.MM.yyyy")
          val startDate =
            start.map(txt => new DateTime(df.parse(txt)).withTimeAtStartOfDay)
          val endDate = end.map(txt => new DateTime(df.parse(txt)).withTimeAtStartOfDay)
          val tarball = File.createTempFile(eid.toString, ".tar.gz")
          Using.resource(
            new TarArchiveOutputStream(
              new GZIPOutputStream(new BufferedOutputStream(new FileOutputStream(tarball)))
            )
          ) { stream =>
            stream.setLongFileMode(TarArchiveOutputStream.LONGFILE_POSIX)
            createArchive(exam, stream, startDate, endDate)
          }
          val contentDisposition = fileHandler.getContentDisposition(tarball)
          val data               = fileHandler.read(tarball)
          val body               = Base64.getEncoder.encodeToString(data)
          Ok(body).withHeaders(("Content-Disposition", contentDisposition));
        case None => NotFound
    }

  private def isEligibleForArchiving(exam: Exam, start: Option[DateTime], end: Option[DateTime]) =
    exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED) &&
      !(start.isDefined && exam.getCreated.isBefore(
        start.get
      )) && !(end.isDefined && exam.getCreated
        .isAfter(end.get))

  private def createArchive(
      prototype: Exam,
      aos: TarArchiveOutputStream,
      start: Option[DateTime],
      end: Option[DateTime]
  ): Unit =
    val children  = prototype.getChildren.asScala.filter(isEligibleForArchiving(_, start, end))
    val questions = mutable.LinkedHashMap.empty[Long, String]
    for (exam <- children)
      val id  = Option(exam.getCreator.getUserIdentifier).getOrElse(exam.getCreator.getId.toString)
      val uid = s"$id-${exam.getId}"
      for (es <- exam.getExamSections.asScala)
        val essays = es.getSectionQuestions.asScala
          .filter(_.getQuestion.getType == Question.Type.EssayQuestion)
        for (essay <- essays)
          val questionId = Option(essay.getQuestion).flatMap(q => Option(q.getParent)) match
            case None    => essay.getQuestion.getId
            case Some(p) => p.getId
          val questionIdText = Option(essay.getQuestion).flatMap(q => Option(q.getParent)) match
            case None    => s"$questionId #original_question_removed"
            case Some(p) => p.getId.toString
          questions.put(questionId, essay.getQuestion.getQuestion)
          val attachment = Option(essay.getEssayAnswer).flatMap(a => Option(a.getAttachment))
          val file       = attachment.map(a => new File(a.getFilePath))
          file match
            case Some(f) if f.exists =>
              val entryName =
                s"${prototype.getId}/$questionIdText/$uid/${attachment.get.getFileName}"
              addFileEntry(entryName, f, aos)
            case _ =>
              if file.isDefined then
                logger.warn(
                  s"Attachment ${attachment.get.getId} is not connected to a file on disk!"
                )
              val entryName = s"${prototype.getId}/$questionId/$uid"
              val entry     = new TarArchiveEntry(entryName)
              aos.putArchiveEntry(entry)
              aos.closeArchiveEntry()
    createSummaryFile(aos, start, end, prototype, questions.toMap)

  private def addFileEntry(name: String, file: File, os: TarArchiveOutputStream): Unit =
    val entry = new TarArchiveEntry(name)
    entry.setSize(file.length)
    os.putArchiveEntry(entry)
    IOUtils.copy(new FileInputStream(file), os)
    os.closeArchiveEntry()

  private def createSummaryFile(
      aos: TarArchiveOutputStream,
      start: Option[DateTime],
      end: Option[DateTime],
      exam: Exam,
      questions: Map[Long, String]
  ): Unit =
    val file = File.createTempFile("summary", ".txt")
    Using.resource(new BufferedWriter(new OutputStreamWriter(new FileOutputStream(file)))) { writer =>
      if start.isDefined || end.isDefined then
        val dtf = DateTimeFormat.forPattern("dd.MM.yyyy")
        val s   = start.map(dtf.print).getOrElse("")
        val e   = end.map(dtf.print).getOrElse("")
        writer.write(s"period: $s-$e")
        writer.newLine()
      writer.write(s"exam id: ${exam.getId}")
      writer.newLine()
      writer.write(s"exam name: ${exam.getName}")
      writer.newLine()
      writer.newLine()
      writer.write("questions")
      writer.newLine()
      for ((k, v) <- questions)
        writer.write(s"$k: ${Jsoup.parse(v).text}")
        writer.newLine()
    }
    addFileEntry("summary.txt", file, aos)
