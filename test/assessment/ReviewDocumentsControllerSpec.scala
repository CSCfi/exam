// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.attachment.Attachment
import models.exam.{Exam, ExamState}
import models.questions.{EssayAnswer, Question, QuestionType}
import models.sections.{ExamSection, ExamSectionQuestion}
import org.apache.commons.compress.archivers.tar.TarArchiveInputStream
import play.api.http.Status
import play.api.mvc.Session
import play.api.test.Helpers.contentAsBytes

import java.io.ByteArrayInputStream
import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.time.Instant
import java.util.zip.GZIPInputStream
import scala.collection.mutable
import scala.concurrent.Future

class ReviewDocumentsControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def parent: Exam =
    DB.find(classOf[Exam]).where().eq("name", "Algoritmit, 2013").isNull("parent").find
      .getOrElse(fail("No exam found"))

  /** The student's copy, started at `created`, under review */
  private def copyStartedAt(created: Instant): Exam =
    val c = parent.children.get(0)
    c.state = ExamState.REVIEW
    c.created = created
    c.update()
    c

  private def essay(text: String, parentQuestion: Question = null): Question =
    val q = new Question
    q.`type` = QuestionType.EssayQuestion
    q.question = text
    q.parent = parentQuestion
    q.save()
    q

  /** An essay answer in the copy, with a file attached when `file` is given */
  private def answer(copy: Exam, question: Question, file: Option[String]): Unit =
    val s = new ExamSection
    s.exam = copy
    s.name = "Essays"
    s.sequenceNumber = 0
    s.save()
    val esq = new ExamSectionQuestion
    esq.examSection = s
    esq.question = question
    esq.save()
    val a = new EssayAnswer
    file.foreach { content =>
      val path = Files.createTempFile("answer", ".txt")
      Files.writeString(path, content)
      val attachment = new Attachment
      attachment.fileName = "answer.txt"
      attachment.filePath = path.toString
      attachment.save()
      a.attachment = attachment
    }
    a.save()
    esq.essayAnswer = a
    esq.update()

  /** The archive's entries as name -> content */
  private def archive(examId: Long, query: String, session: Session): Map[String, String] =
    val result =
      runIO(makeRequest("GET", s"/app/exam/$examId/attachments$query", session = session))
    statusOf(result) must be(Status.OK)
    val tar = new TarArchiveInputStream(new GZIPInputStream(
      new ByteArrayInputStream(contentAsBytes(Future.successful(result)).toArray)
    ))
    val entries = mutable.LinkedHashMap.empty[String, String]
    Iterator.continually(tar.getNextEntry).takeWhile(_ != null).foreach { entry =>
      entries(entry.getName) = new String(tar.readAllBytes(), StandardCharsets.UTF_8)
    }
    entries.toMap

  "ReviewDocumentsController" when:
    "archiving essay attachments" should:
      "include copies started on the last day, on the organisation's calendar" in:
        val (_, session) = runIO(loginAsTeacher())
        // 00:30 on 13 June in Finland, still 12 June in UTC
        val copy = copyStartedAt(Instant.parse("2030-06-12T21:30:00Z"))
        val q    = essay("<p>Explain</p>")
        answer(copy, essay("<p>Explain</p>", q), Some("My essay"))

        val entries = archive(parent.id, "?start=13.06.2030&end=13.06.2030", session)

        val files = entries.filter((name, _) => name.endsWith("answer.txt"))
        files.size must be(1)
        files.head._1 must startWith(s"${parent.id}/${q.id}/")
        files.head._2 must be("My essay")
        entries("summary.txt") must include("period: 13.06.2030-13.06.2030")
        entries("summary.txt") must include(s"${q.id}: Explain")

      "leave out copies started outside the period" in:
        val (_, session) = runIO(loginAsTeacher())
        val copy         = copyStartedAt(Instant.parse("2030-06-16T10:00:00Z"))
        answer(copy, essay("Explain", essay("Explain")), Some("Too late"))

        archive(parent.id, "?start=10.06.2030&end=15.06.2030", session).keySet must be(
          Set("summary.txt")
        )

      "file answers to a removed question under it, with or without a file" in:
        val (_, session) = runIO(loginAsTeacher())
        val copy         = copyStartedAt(Instant.parse("2030-06-12T10:00:00Z"))
        // The copy's question has lost its original
        val orphan = essay("Explain")
        answer(copy, orphan, None)

        val folders = archive(parent.id, "", session).keySet.filterNot(_ == "summary.txt")

        folders.size must be(1)
        folders.head must startWith(s"${parent.id}/${orphan.id} #original_question_removed/")
