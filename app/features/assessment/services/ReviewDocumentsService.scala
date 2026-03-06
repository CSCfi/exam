// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.exam.Exam
import models.questions.Question
import models.user.{Role, User}
import org.apache.commons.compress.archivers.tar.{TarArchiveEntry, TarArchiveOutputStream}
import org.apache.commons.io.IOUtils
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import org.jsoup.Jsoup
import play.api.Logging
import services.csv.CsvBuilder

import java.io.*
import java.nio.charset.StandardCharsets
import java.text.SimpleDateFormat
import java.util.zip.GZIPOutputStream
import javax.inject.Inject
import scala.collection.mutable
import scala.jdk.CollectionConverters.*
import scala.util.Try

class ReviewDocumentsService @Inject() (private val csvBuilder: CsvBuilder)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def importGrades(file: File, user: User): Either[String, Unit] =
    Try {
      val role = if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then Role.Name.ADMIN
      else Role.Name.TEACHER
      csvBuilder.parseGrades(file, user, role)
    }.toEither.left.map { e =>
      logger.error("Failed to parse CSV file. Stack trace follows", e)
      "i18n_internal_error"
    }

  def findExam(examId: Long): Option[Exam] = Option(DB.find(classOf[Exam], examId))

  /** Streams the archived attachments tarball to the given output stream. Caller must close the
    * stream. Throws on error.
    */
  def streamArchivedAttachments(
      exam: Exam,
      start: Option[String],
      end: Option[String]
  )(os: OutputStream): Unit =
    val df = new SimpleDateFormat("dd.MM.yyyy")
    val startDate =
      start.map(txt => new DateTime(df.parse(txt)).withTimeAtStartOfDay)
    val endDate = end.map(txt => new DateTime(df.parse(txt)).withTimeAtStartOfDay)
    Try {
      val gzip = new GZIPOutputStream(os)
      val tar  = new TarArchiveOutputStream(gzip)
      tar.setLongFileMode(TarArchiveOutputStream.LONGFILE_POSIX)
      try
        createArchive(exam, tar, startDate, endDate)
      finally
        tar.finish()
        gzip.finish()
    }.fold(
      { e =>
        logger.error("Error creating archive", e)
        throw e
      },
      _ => ()
    )

  private def isEligibleForArchiving(exam: Exam, start: Option[DateTime], end: Option[DateTime]) =
    exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED) &&
      start.forall(!exam.getCreated.isBefore(_)) &&
      end.forall(!exam.getCreated.isAfter(_))

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

  private def addContentEntry(
      name: String,
      content: Array[Byte],
      aos: TarArchiveOutputStream
  ): Unit =
    val entry = new TarArchiveEntry(name)
    entry.setSize(content.length)
    aos.putArchiveEntry(entry)
    aos.write(content)
    aos.closeArchiveEntry()

  private def createSummaryFile(
      aos: TarArchiveOutputStream,
      start: Option[DateTime],
      end: Option[DateTime],
      exam: Exam,
      questions: Map[Long, String]
  ): Unit =
    val dtf = DateTimeFormat.forPattern("dd.MM.yyyy")
    val periodLine = Option.when(start.isDefined || end.isDefined) {
      val s = start.map(dtf.print).getOrElse("")
      val e = end.map(dtf.print).getOrElse("")
      s"period: $s-$e"
    }
    val lines = periodLine.toSeq ++ Seq(
      s"exam id: ${exam.getId}",
      s"exam name: ${exam.getName}",
      "",
      "questions"
    ) ++ questions.map { case (k, v) => s"$k: ${Jsoup.parse(v).text}" }
    val content = lines.mkString("\n")
    addContentEntry("summary.txt", content.getBytes(StandardCharsets.UTF_8), aos)
