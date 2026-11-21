// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.attachment

import base.BaseIntegrationSpec
import cats.effect.IO
import database.EbeanPaths.path
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{Comment, ExamInspection, LanguageInspection}
import models.attachment.Attachment
import models.exam.Exam
import models.questions.{EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Permission, PermissionType, User}
import org.apache.commons.io.FileUtils
import play.api.http.Status
import play.api.libs.Files.SingletonTemporaryFileCreator
import play.api.mvc.{MultipartFormData, Result, Session}
import play.api.test.FakeRequest
import play.api.test.Helpers.*

import java.io.File
import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path}
import scala.concurrent.Future

class AttachmentControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private val baseUrl     = "/app/attachment"
  private val fileContent = "attachment content åäö"
  private val fileName    = "test file.txt"

  // Integration config stores attachments under target/attachments, relative to the app root
  private def attachmentRoot: File = new File(app.path, "target/attachments")

  override def afterEach(): Unit =
    try FileUtils.deleteDirectory(attachmentRoot)
    finally super.afterEach()

  // --- helpers ---------------------------------------------------------------------------------

  private def upload(
      url: String,
      session: Session,
      dataParts: Map[String, String] = Map.empty,
      withFile: Boolean = true,
      name: String = fileName,
      content: String = fileContent
  ): Result =
    ensureTestDataLoaded()
    val tmp = Files.createTempFile("attachment_spec", ".tmp")
    Files.writeString(tmp, content, StandardCharsets.UTF_8)
    val files =
      if withFile then
        Seq(
          MultipartFormData.FilePart(
            key = "file",
            filename = name,
            contentType = Some("text/plain"),
            ref = SingletonTemporaryFileCreator.create(tmp)
          )
        )
      else Seq.empty
    val form = MultipartFormData(
      dataParts = dataParts.map((k, v) => k -> Seq(v)),
      files = files,
      badParts = Seq.empty
    )
    val request = FakeRequest(POST, url)
      .withHeaders("Csrf-Token" -> "nocheck")
      .withSession(session.data.toSeq*)
      .withMultipartFormDataBody(form)
    try runIO(IO.fromFuture(IO(route(app, request).getOrElse(fail(s"No route for $url")))))
    finally Files.deleteIfExists(tmp)

  private def bodyOf(result: Result): String =
    new String(contentAsBytes(Future.successful(result)).toArray, StandardCharsets.UTF_8)

  private def assertDownload(result: Result, expectedContent: String = fileContent): Unit =
    statusOf(result) mustBe Status.OK
    headerOf(result, "Content-Disposition") mustBe
      Some("attachment; filename*=UTF-8''test%20file.txt")
    result.body.contentType.exists(_.startsWith("text/plain")) mustBe true
    bodyOf(result) mustBe expectedContent

  private def assertStoredUnder(attachment: Attachment, subPath: String): Unit =
    val file = new File(attachment.filePath)
    file.exists() mustBe true
    file.getCanonicalPath must startWith(new File(attachmentRoot, subPath).getCanonicalPath)
    Files.readString(file.toPath, StandardCharsets.UTF_8) mustBe fileContent

  private def user(eppn: String): User =
    DB.find(classOf[User]).where().eq("eppn", eppn).find.getOrElse(fail(s"$eppn missing"))

  private def exam(id: Long): Exam = DB.find(classOf[Exam], id)

  /** Exam created by the student (a student's exam copy in the test data). */
  private def studentExam(): Exam =
    ensureTestDataLoaded()
    DB.find(classOf[Exam])
      .where()
      .eq(path[Exam]("creator"), user("student@funet.fi"))
      .list
      .headOption
      .getOrElse(fail("no student exam in test data"))

  /** Exam created by teacher@funet.fi. */
  private def teacherExam(): Exam =
    ensureTestDataLoaded()
    DB.find(classOf[Exam])
      .where()
      .eq(path[Exam]("creator"), user("teacher@funet.fi"))
      .isNull(path[Exam]("parent"))
      .orderBy("id")
      .list
      .headOption
      .getOrElse(fail("no teacher exam in test data"))

  private def sectionQuestionOf(owner: String): ExamSectionQuestion =
    ensureTestDataLoaded()
    DB.find(classOf[ExamSectionQuestion])
      .where()
      .eq(path[ExamSectionQuestion]("examSection.exam.creator"), user(owner))
      .orderBy("id")
      .list
      .headOption
      .getOrElse(fail(s"no section question for exam created by $owner"))

  private def reloadEsq(id: Long): ExamSectionQuestion = DB.find(classOf[ExamSectionQuestion], id)

  private def attachmentCount: Int = DB.find(classOf[Attachment]).findCount()

  private def grantLanguageInspection(eppn: String): Unit =
    val u    = user(eppn)
    val perm = new Permission
    perm.`type` = PermissionType.CAN_INSPECT_LANGUAGE
    perm.save()
    u.permissions.add(perm)
    u.update()

  private def addQuestionOwner(qid: Long, eppn: String): Unit =
    val q = DB.find(classOf[Question], qid)
    q.questionOwners.add(user(eppn))
    q.update()

  private def addExamOwner(e: Exam, eppn: String): Unit =
    val reloaded = exam(e.id)
    reloaded.examOwners.add(user(eppn))
    reloaded.update()

  private def removeInspections(e: Exam): Unit =
    DB.find(classOf[ExamInspection]).where().eq(path[ExamInspection]("exam.id"), e.id).delete()

  private def createLanguageInspection(e: Exam): LanguageInspection =
    val li = new LanguageInspection
    li.exam = e
    li.save()
    li

  // --- tests -----------------------------------------------------------------------------------

  "AttachmentController" when:

    "adding an exam attachment" should:
      "store the file and link it to the exam for the owner" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        val result       = upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))

        statusOf(result) mustBe Status.OK
        val json = contentAsJsonOf(result)
        (json \ "fileName").as[String] mustBe fileName
        (json \ "mimeType").as[String] mustBe "text/plain"

        val stored = exam(e.id).attachment
        stored must not be null
        stored.fileName mustBe fileName
        assertStoredUnder(stored, s"exam/${e.id}")

      "replace the previous attachment and remove its file" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        statusOf(upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))) mustBe
          Status.OK
        val first     = exam(e.id).attachment
        val firstPath = first.filePath
        val count     = attachmentCount

        val result = upload(
          s"$baseUrl/exam",
          session,
          Map("examId" -> e.id.toString),
          name = "second.txt"
        )
        statusOf(result) mustBe Status.OK

        val second = exam(e.id).attachment
        second.id must not be first.id
        second.fileName mustBe "second.txt"
        DB.find(classOf[Attachment], first.id) mustBe null
        new File(firstPath).exists() mustBe false
        attachmentCount mustBe count

      "allow admin to add attachment to someone else's exam" in:
        val (_, session) = runIO(loginAsAdmin())
        val e            = teacherExam()
        statusOf(upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))) mustBe
          Status.OK
        exam(e.id).attachment must not be null

      "forbid a teacher who does not own the exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = studentExam()
        val result       = upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))
        statusOf(result) mustBe Status.FORBIDDEN
        exam(e.id).attachment mustBe null
        attachmentRoot.exists() mustBe false

      "forbid a student" in:
        val (_, session) = runIO(loginAsStudent())
        val e            = teacherExam()
        statusOf(upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))) mustBe
          Status.FORBIDDEN

      "return 404 for a nonexistent exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam", session, Map("examId" -> "999999"))) mustBe
          Status.NOT_FOUND

      "return 400 when examId is missing or invalid" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam", session)) mustBe Status.BAD_REQUEST
        statusOf(upload(s"$baseUrl/exam", session, Map("examId" -> "abc"))) mustBe
          Status.BAD_REQUEST

      "return 400 when the file is missing" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        val result       = upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString), false)
        statusOf(result) mustBe Status.BAD_REQUEST

      "require authentication" in:
        val e = teacherExam()
        statusOf(upload(s"$baseUrl/exam", Session(), Map("examId" -> e.id.toString))) mustBe
          Status.UNAUTHORIZED

    "downloading an exam attachment" should:
      "stream the file to the teacher" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))
        assertDownload(runIO(get(s"$baseUrl/exam/${e.id}", session = session)))

      "stream the file to a student who created the exam copy" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val e                 = studentExam()
        statusOf(upload(s"$baseUrl/exam", adminSession, Map("examId" -> e.id.toString)))
          .mustBe(Status.OK)
        val (_, studentSession) = runIO(loginAsStudent())
        assertDownload(runIO(get(s"$baseUrl/exam/${e.id}", session = studentSession)))

      "return 404 to a student for an exam they did not create" in:
        val (_, teacherSession) = runIO(loginAsTeacher())
        val e                   = teacherExam()
        upload(s"$baseUrl/exam", teacherSession, Map("examId" -> e.id.toString))
        val (_, studentSession) = runIO(loginAsStudent())
        statusOf(runIO(get(s"$baseUrl/exam/${e.id}", session = studentSession))) mustBe
          Status.NOT_FOUND

      "return 404 when the exam has no attachment" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"$baseUrl/exam/${teacherExam().id}", session = session))) mustBe
          Status.NOT_FOUND

      "return 500 when the file is missing from disk" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))
        Files.delete(Path.of(exam(e.id).attachment.filePath))

        val result = runIO(get(s"$baseUrl/exam/${e.id}", session = session))
        statusOf(result) mustBe Status.INTERNAL_SERVER_ERROR
        contentAsStringOf(result) mustBe "i18n_file_not_found_but_referred_in_database"

    "deleting an exam attachment" should:
      "remove the attachment row and the file for the owner" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))
        val stored     = exam(e.id).attachment
        val storedPath = stored.filePath

        statusOf(runIO(delete(s"$baseUrl/exam/${e.id}", session = session))) mustBe Status.OK
        exam(e.id).attachment mustBe null
        DB.find(classOf[Attachment], stored.id) mustBe null
        new File(storedPath).exists() mustBe false

      "keep the file on disk while another attachment still refers to it" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        upload(s"$baseUrl/exam", session, Map("examId" -> e.id.toString))
        val stored = exam(e.id).attachment
        // e.g. an exam copy sharing the parent's file
        val shared = stored.copy()
        shared.save()

        statusOf(runIO(delete(s"$baseUrl/exam/${e.id}", session = session))) mustBe Status.OK
        exam(e.id).attachment mustBe null
        new File(stored.filePath).exists() mustBe true

      "forbid a teacher who does not own the exam" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val e                 = studentExam()
        upload(s"$baseUrl/exam", adminSession, Map("examId" -> e.id.toString))
        val (_, session) = runIO(loginAsTeacher())

        val result = runIO(delete(s"$baseUrl/exam/${e.id}", session = session))
        statusOf(result) mustBe Status.FORBIDDEN
        contentAsStringOf(result) mustBe "i18n_error_access_forbidden"
        exam(e.id).attachment must not be null

      "return 404 for a nonexistent exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(delete(s"$baseUrl/exam/999999", session = session))) mustBe
          Status.NOT_FOUND

    "managing question attachments" should:
      "add, download and delete an attachment as a question owner" in:
        val (_, session) = runIO(loginAsTeacher())
        val qid          = sectionQuestionOf("teacher@funet.fi").question.id
        addQuestionOwner(qid, "teacher@funet.fi")

        val added = upload(s"$baseUrl/question", session, Map("questionId" -> qid.toString))
        statusOf(added) mustBe Status.OK
        (contentAsJsonOf(added) \ "fileName").as[String] mustBe fileName
        val stored = DB.find(classOf[Question], qid).attachment
        assertStoredUnder(stored, s"question/$qid")

        assertDownload(runIO(get(s"$baseUrl/question/$qid", session = session)))

        statusOf(runIO(delete(s"$baseUrl/question/$qid", session = session))) mustBe Status.OK
        DB.find(classOf[Question], qid).attachment mustBe null
        new File(stored.filePath).exists() mustBe false
        statusOf(runIO(get(s"$baseUrl/question/$qid", session = session))) mustBe
          Status.NOT_FOUND

      "let a teacher owning an exam that uses the question add an attachment" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = sectionQuestionOf("teacher@funet.fi")
        addExamOwner(esq.examSection.exam, "teacher@funet.fi")
        val qid = esq.question.id
        statusOf(upload(s"$baseUrl/question", session, Map("questionId" -> qid.toString))) mustBe
          Status.OK
        statusOf(runIO(delete(s"$baseUrl/question/$qid", session = session))) mustBe Status.OK

      "let a teacher add an attachment to a shared question" in:
        val (_, session) = runIO(loginAsTeacher())
        val qid          = sectionQuestionOf("teacher@funet.fi").question.id
        val q            = DB.find(classOf[Question], qid)
        q.shared = true
        q.update()
        statusOf(upload(s"$baseUrl/question", session, Map("questionId" -> qid.toString))) mustBe
          Status.OK

      "forbid a teacher who neither owns the question nor an exam using it" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val qid               = sectionQuestionOf("teacher@funet.fi").question.id
        statusOf(upload(s"$baseUrl/question", adminSession, Map("questionId" -> qid.toString)))
          .mustBe(Status.OK)
        val stored     = DB.find(classOf[Question], qid).attachment
        val storedPath = stored.filePath

        val (_, session) = runIO(loginAsTeacher())
        val added = upload(
          s"$baseUrl/question",
          session,
          Map("questionId" -> qid.toString),
          name = "other.txt"
        )
        statusOf(added) mustBe Status.FORBIDDEN
        contentAsStringOf(added) mustBe "i18n_error_access_forbidden"

        val deleted = runIO(delete(s"$baseUrl/question/$qid", session = session))
        statusOf(deleted) mustBe Status.FORBIDDEN
        contentAsStringOf(deleted) mustBe "i18n_error_access_forbidden"

        DB.find(classOf[Question], qid).attachment.id mustBe stored.id
        new File(storedPath).exists() mustBe true

      "let a student download the attachment of a question in their own exam" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val qid               = sectionQuestionOf("student@funet.fi").question.id
        upload(s"$baseUrl/question", adminSession, Map("questionId" -> qid.toString))

        val (_, studentSession) = runIO(loginAsStudent())
        assertDownload(runIO(get(s"$baseUrl/question/$qid", session = studentSession)))

      "hide from a student the attachment of a question outside their exams" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val studentQuestionIds =
          DB.find(classOf[ExamSectionQuestion])
            .where()
            .eq(
              path[ExamSectionQuestion]("examSection.exam.creator"),
              user("student@funet.fi")
            )
            .list
            .map(_.question.id)
            .toSet
        val qid = DB.find(classOf[Question])
          .where()
          .notIn("id", studentQuestionIds.toSeq*)
          .orderBy("id")
          .list
          .headOption
          .getOrElse(fail("no question outside student's exams"))
          .id
        upload(s"$baseUrl/question", adminSession, Map("questionId" -> qid.toString))

        val (_, studentSession) = runIO(loginAsStudent())
        statusOf(runIO(get(s"$baseUrl/question/$qid", session = studentSession))) mustBe
          Status.NOT_FOUND

      "return 404 for a nonexistent question" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/question", session, Map("questionId" -> "999999"))) mustBe
          Status.NOT_FOUND
        statusOf(runIO(delete(s"$baseUrl/question/999999", session = session))) mustBe
          Status.NOT_FOUND
        statusOf(runIO(get(s"$baseUrl/question/999999", session = session))) mustBe
          Status.NOT_FOUND

      "return 400 when questionId is missing" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/question", session)) mustBe Status.BAD_REQUEST

      "forbid a student from adding or deleting" in:
        val (_, session) = runIO(loginAsStudent())
        val qid          = sectionQuestionOf("student@funet.fi").question.id
        statusOf(upload(s"$baseUrl/question", session, Map("questionId" -> qid.toString))) mustBe
          Status.FORBIDDEN
        statusOf(runIO(delete(s"$baseUrl/question/$qid", session = session))) mustBe
          Status.FORBIDDEN

    "managing question answer attachments" should:
      "add, download and delete an answer attachment as the student" in:
        val (_, session) = runIO(loginAsStudent())
        val esq          = sectionQuestionOf("student@funet.fi")

        val added =
          upload(s"$baseUrl/question/answer", session, Map("questionId" -> esq.id.toString))
        statusOf(added) mustBe Status.OK
        (contentAsJsonOf(added) \ "attachment" \ "fileName").as[String] mustBe fileName

        val answer = reloadEsq(esq.id).essayAnswer
        answer must not be null
        assertStoredUnder(answer.attachment, s"question/${esq.id}/answer/${answer.id}")

        assertDownload(runIO(get(s"$baseUrl/question/${esq.id}/answer", session = session)))

        val stored  = answer.attachment
        val deleted = runIO(delete(s"$baseUrl/question/${esq.id}/answer", session = session))
        statusOf(deleted) mustBe Status.OK
        (contentAsJsonOf(deleted) \ "attachment").toOption.forall(_ == play.api.libs.json.JsNull)
          .mustBe(true)
        DB.find(classOf[EssayAnswer], answer.id).attachment mustBe null
        DB.find(classOf[Attachment], stored.id) mustBe null
        new File(stored.filePath).exists() mustBe false

      "replace the previous answer attachment" in:
        val (_, session) = runIO(loginAsStudent())
        val esq          = sectionQuestionOf("student@funet.fi")
        upload(s"$baseUrl/question/answer", session, Map("questionId" -> esq.id.toString))
        val first     = reloadEsq(esq.id).essayAnswer.attachment
        val firstPath = first.filePath

        val result = upload(
          s"$baseUrl/question/answer",
          session,
          Map("questionId" -> esq.id.toString),
          content = "second"
        )
        statusOf(result) mustBe Status.OK
        val second = reloadEsq(esq.id).essayAnswer.attachment
        second.id must not be first.id
        DB.find(classOf[Attachment], first.id) mustBe null
        new File(firstPath).exists() mustBe false
        assertDownload(
          runIO(get(s"$baseUrl/question/${esq.id}/answer", session = session)),
          "second"
        )

      "forbid a student from answering a question outside their exams" in:
        val (_, session) = runIO(loginAsStudent())
        val esq          = sectionQuestionOf("teacher@funet.fi")
        val result =
          upload(s"$baseUrl/question/answer", session, Map("questionId" -> esq.id.toString))
        statusOf(result) mustBe Status.FORBIDDEN
        Option(reloadEsq(esq.id).essayAnswer).flatMap(a => Option(a.attachment)) mustBe None

      "forbid a teacher from adding an answer attachment" in:
        val (_, session) = runIO(loginAsTeacher())
        val esq          = sectionQuestionOf("student@funet.fi")
        statusOf(
          upload(s"$baseUrl/question/answer", session, Map("questionId" -> esq.id.toString))
        ) mustBe Status.FORBIDDEN

      "return 400 when questionId is missing" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(upload(s"$baseUrl/question/answer", session)) mustBe Status.BAD_REQUEST

      "return 404 on delete or download when there is no attachment" in:
        val (_, session) = runIO(loginAsStudent())
        val esq          = sectionQuestionOf("student@funet.fi")
        statusOf(runIO(delete(s"$baseUrl/question/${esq.id}/answer", session = session))) mustBe
          Status.NOT_FOUND
        statusOf(runIO(get(s"$baseUrl/question/${esq.id}/answer", session = session))) mustBe
          Status.NOT_FOUND

      "let a teacher download but not delete the answer attachment" in:
        val (_, studentSession) = runIO(loginAsStudent())
        val esq                 = sectionQuestionOf("student@funet.fi")
        upload(s"$baseUrl/question/answer", studentSession, Map("questionId" -> esq.id.toString))

        val (_, teacherSession) = runIO(loginAsTeacher())
        assertDownload(
          runIO(get(s"$baseUrl/question/${esq.id}/answer", session = teacherSession))
        )
        statusOf(
          runIO(delete(s"$baseUrl/question/${esq.id}/answer", session = teacherSession))
        ) mustBe Status.FORBIDDEN

      "let an admin delete the answer attachment" in:
        val (_, studentSession) = runIO(loginAsStudent())
        val esq                 = sectionQuestionOf("student@funet.fi")
        upload(s"$baseUrl/question/answer", studentSession, Map("questionId" -> esq.id.toString))

        val (_, adminSession) = runIO(loginAsAdmin())
        statusOf(
          runIO(delete(s"$baseUrl/question/${esq.id}/answer", session = adminSession))
        ) mustBe Status.OK
        reloadEsq(esq.id).essayAnswer.attachment mustBe null

      "hide another student's answer attachment from a student" in:
        val (_, studentSession) = runIO(loginAsStudent())
        val esq                 = sectionQuestionOf("student@funet.fi")
        upload(s"$baseUrl/question/answer", studentSession, Map("questionId" -> esq.id.toString))
        // Move the exam copy to another user
        val e = esq.examSection.exam
        e.creator = user("teacher@b.funet.fi")
        e.update()

        statusOf(
          runIO(get(s"$baseUrl/question/${esq.id}/answer", session = studentSession))
        ) mustBe Status.NOT_FOUND
        statusOf(
          runIO(delete(s"$baseUrl/question/${esq.id}/answer", session = studentSession))
        ) mustBe Status.NOT_FOUND

    "managing feedback attachments" should:
      "create feedback, store, download and delete the attachment" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = studentExam()
        exam(e.id).examFeedback mustBe null

        val added = upload(s"$baseUrl/exam/${e.id}/feedback", session)
        statusOf(added) mustBe Status.OK
        (contentAsJsonOf(added) \ "fileName").as[String] mustBe fileName

        val feedback = exam(e.id).examFeedback
        feedback must not be null
        feedback.creator.eppn mustBe "teacher@funet.fi"
        assertStoredUnder(feedback.attachment, s"exam/${e.id}/feedback")

        val (_, studentSession) = runIO(loginAsStudent())
        assertDownload(runIO(get(s"$baseUrl/exam/${e.id}/feedback", session = studentSession)))

        val stored = feedback.attachment
        statusOf(runIO(delete(s"$baseUrl/exam/${e.id}/feedback", session = session))) mustBe
          Status.OK
        val after = exam(e.id).examFeedback
        after.id mustBe feedback.id // comment itself is kept
        after.attachment mustBe null
        new File(stored.filePath).exists() mustBe false

      "forbid a teacher who does not review the exam" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        val e                 = studentExam()
        statusOf(upload(s"$baseUrl/exam/${e.id}/feedback", adminSession)) mustBe Status.OK
        val stored     = exam(e.id).examFeedback.attachment
        val storedPath = stored.filePath
        removeInspections(e)

        val (_, session) = runIO(loginAsTeacher())
        val added        = upload(s"$baseUrl/exam/${e.id}/feedback", session, name = "other.txt")
        statusOf(added) mustBe Status.FORBIDDEN
        contentAsStringOf(added) mustBe "i18n_error_access_forbidden"

        val deleted = runIO(delete(s"$baseUrl/exam/${e.id}/feedback", session = session))
        statusOf(deleted) mustBe Status.FORBIDDEN
        contentAsStringOf(deleted) mustBe "i18n_error_access_forbidden"

        exam(e.id).examFeedback.attachment.id mustBe stored.id
        new File(storedPath).exists() mustBe true

      "reuse existing feedback comment" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = studentExam()
        val comment            = new Comment
        comment.comment = "Well done"
        comment.setCreatorWithDate(teacher)
        comment.save()
        e.examFeedback = comment
        e.update()

        statusOf(upload(s"$baseUrl/exam/${e.id}/feedback", session)) mustBe Status.OK
        val feedback = exam(e.id).examFeedback
        feedback.id mustBe comment.id
        feedback.comment mustBe "Well done"
        feedback.attachment must not be null

      "return 404 to a student for an exam they did not create" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = teacherExam()
        upload(s"$baseUrl/exam/${e.id}/feedback", session)
        val (_, studentSession) = runIO(loginAsStudent())
        statusOf(runIO(get(s"$baseUrl/exam/${e.id}/feedback", session = studentSession))) mustBe
          Status.NOT_FOUND

      "return 404 when there is no feedback attachment" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"$baseUrl/exam/${studentExam().id}/feedback", session = session)))
          .mustBe(Status.NOT_FOUND)

      "return 404 for a nonexistent exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam/999999/feedback", session)) mustBe Status.NOT_FOUND
        val deleted = runIO(delete(s"$baseUrl/exam/999999/feedback", session = session))
        statusOf(deleted) mustBe Status.NOT_FOUND
        contentAsStringOf(deleted) mustBe "i18n_exam_not_found"

      "return 400 when the file is missing" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam/${studentExam().id}/feedback", session, withFile = false))
          .mustBe(Status.BAD_REQUEST)

      "forbid a student from adding feedback" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(upload(s"$baseUrl/exam/${studentExam().id}/feedback", session)) mustBe
          Status.FORBIDDEN

    "managing language inspection statement attachments" should:
      "store, download and delete the statement attachment for a language inspector" in:
        ensureTestDataLoaded()
        grantLanguageInspection("teacher@funet.fi")
        val e = studentExam()
        createLanguageInspection(e)
        val (_, session) = runIO(loginAsTeacher())

        val added = upload(s"$baseUrl/exam/${e.id}/statement", session)
        statusOf(added) mustBe Status.OK
        (contentAsJsonOf(added) \ "fileName").as[String] mustBe fileName

        val inspection = DB.find(classOf[LanguageInspection])
          .where()
          .eq(path[LanguageInspection]("exam.id"), e.id)
          .find
          .getOrElse(fail("inspection missing"))
        inspection.statement must not be null
        inspection.statement.creator.eppn mustBe "teacher@funet.fi"
        assertStoredUnder(inspection.statement.attachment, s"exam/${e.id}/inspectionstatement")

        val (_, studentSession) = runIO(loginAsStudent())
        assertDownload(runIO(get(s"$baseUrl/exam/${e.id}/statement", session = studentSession)))

        val stored = inspection.statement.attachment
        statusOf(runIO(delete(s"$baseUrl/exam/${e.id}/statement", session = session))) mustBe
          Status.OK
        DB.find(classOf[Comment], inspection.statement.id).attachment mustBe null
        new File(stored.filePath).exists() mustBe false
        statusOf(runIO(get(s"$baseUrl/exam/${e.id}/statement", session = session))) mustBe
          Status.NOT_FOUND

      "return 404 when the exam has no language inspection" in:
        ensureTestDataLoaded()
        grantLanguageInspection("teacher@funet.fi")
        val (_, session) = runIO(loginAsTeacher())
        val e            = studentExam()
        statusOf(upload(s"$baseUrl/exam/${e.id}/statement", session)) mustBe Status.NOT_FOUND
        val deleted = runIO(delete(s"$baseUrl/exam/${e.id}/statement", session = session))
        statusOf(deleted) mustBe Status.NOT_FOUND
        contentAsStringOf(deleted) mustBe "i18n_exam_not_found"

      "forbid users without the language inspection permission" in:
        ensureTestDataLoaded()
        val e = studentExam()
        createLanguageInspection(e)
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam/${e.id}/statement", session)) mustBe Status.FORBIDDEN
        statusOf(runIO(delete(s"$baseUrl/exam/${e.id}/statement", session = session))) mustBe
          Status.FORBIDDEN

      "hide the statement from a student who did not create the exam" in:
        ensureTestDataLoaded()
        grantLanguageInspection("teacher@funet.fi")
        val e = teacherExam()
        createLanguageInspection(e)
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"$baseUrl/exam/${e.id}/statement", session)) mustBe Status.OK

        val (_, studentSession) = runIO(loginAsStudent())
        statusOf(runIO(get(s"$baseUrl/exam/${e.id}/statement", session = studentSession)))
          .mustBe(Status.NOT_FOUND)
