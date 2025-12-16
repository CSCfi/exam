// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import cats.effect.IO
import helpers.BaseServlet
import models.iop.CollaborativeExam
import play.api.http.Status
import play.api.libs.Files
import play.api.mvc.{MultipartFormData, Result}
import play.api.test.FakeRequest
import play.api.test.Helpers.{POST, route, writeableOf_AnyContentAsMultipartForm}

class CollaborativeAttachmentControllerSpec extends BaseCollaborativeAttachmentSpec[CollaborativeExam]:

  private val baseURL = "/app/iop/collab/attachment"

  "CollaborativeAttachmentController" when:
    "downloading exam attachments" should:
      "allow teacher to download exam attachment" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val result = runIO(get(s"$baseURL/exam/${externalExam.getId}", session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("GET", attachmentServlet)
        assertDownloadResult(result)

    "managing question attachments" should:
      "add attachment to question as teacher" in:
        val (_, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                        = runIO(loginAsTeacher())
        getExamSectionQuestion(examServlet.getExam, Some(examSectionQuestion.getId)).getQuestion.setAttachment(null)
        val path = "/question"
        uploadAttachment(
          path,
          Map("examId" -> externalExam.getId.toString, "questionId" -> examSectionQuestion.getId.toString),
          session
        )
        examServlet.getWaiter.await(10000, 1)
        assertLastCall("PUT", examServlet)
        val exam = examServlet.getExam
        val sq   = getExamSectionQuestion(exam, Some(examSectionQuestion.getId))
        val attachment = Option(sq.getQuestion.getAttachment) match
          case Some(attachment) => attachment
          case None             => fail("Question attachment not set")
        attachment.getExternalId must be("abcdefg123456")
        attachment.getFileName must be("test_image.png")

      "download question attachment as teacher" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val url    = s"$baseURL/exam/${externalExam.getId}/question/${examSectionQuestion.getId}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("GET", attachmentServlet)
        assertDownloadResult(result)

    "managing question answer attachments" should:
      "add attachment to question answer as student" in:
        val (_, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                           = runIO(loginAsStudent())
        val result = uploadAttachment(
          "/question/answer",
          Map(
            "examId"     -> externalExam.getId.toString,
            "questionId" -> examSectionQuestion.getId.toString
          ),
          session
        )
        examServlet.getWaiter.await(10000, 1)
        assertLastCall("PUT", examServlet)
        // Check the servlet's exam - it should have the EssayAnswer from the serialized exam
        val exam2                = examServlet.getExam
        val examSectionQuestion2 = getExamSectionQuestion(exam2, Some(examSectionQuestion.getId))
        Option(examSectionQuestion2.getEssayAnswer) match
          case Some(ea) =>
            Option(ea.getAttachment) match
              case Some(attachment) =>
                attachment.getExternalId must be("abcdefg123456")
                attachment.getFileName must be("test_image.png")
              case None => fail("Question answer attachment not set")
          case None => fail("EssayAnswer not created")

      "delete question answer attachment as student" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                           = runIO(loginAsStudent())
        val essayAnswer                               = examSectionQuestion.getEssayAnswer
        val attachment = createAttachment("test_image.png", testImage.getAbsolutePath, "image/png")
        attachment.setExternalId("abcdefg12345")
        essayAnswer.setAttachment(attachment)
        examServlet.setExam(exam)

        val eBefore  = examServlet.getExam
        val sqBefore = getExamSectionQuestion(eBefore, Some(examSectionQuestion.getId))
        Option(sqBefore.getEssayAnswer).map(_.getAttachment) must be(defined)

        val url    = s"$baseURL/question/${examSectionQuestion.getId}/answer/${externalExam.getId}"
        val result = runIO(delete(url, session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("DELETE", attachmentServlet)

        examServlet.getWaiter.await(10000, 1)
        val eAfter  = examServlet.getExam
        val sqAfter = getExamSectionQuestion(eAfter, Some(examSectionQuestion.getId))
        Option(sqAfter.getEssayAnswer).flatMap(ea => Option(ea.getAttachment)) must be(empty)

      "forbid teacher from deleting question answer attachment" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val url    = s"$baseURL/question/${examSectionQuestion.getId}/answer/${externalExam.getId}"
        val result = runIO(delete(url, session = session))
        statusOf(result) must be(Status.FORBIDDEN)

  private def assertLastCall(method: String, servlet: BaseServlet): Unit =
    servlet.getLastCallMethod must be(method)

  private def uploadAttachment(
      path: String,
      idParts: Map[String, String],
      session: play.api.mvc.Session
  ): Result =
    // Create a temporary file from the test image
    val tempFile = java.io.File.createTempFile("test_upload", ".png")
    java.nio.file.Files.copy(testImage.toPath, tempFile.toPath, java.nio.file.StandardCopyOption.REPLACE_EXISTING)
    val temporaryFile = Files.SingletonTemporaryFileCreator.create(tempFile.toPath)

    try
      // Create multipart form data with file and form fields
      val filePart = MultipartFormData.FilePart(
        key = "file",
        filename = "test_image.png",
        contentType = Some("image/png"),
        ref = temporaryFile
      )

      val dataParts = idParts.map { case (key, value) =>
        key -> Seq(value)
      }

      val multipartFormData = MultipartFormData(
        dataParts = dataParts,
        files = Seq(filePart),
        badParts = Seq.empty
      )

      // Create the request with multipart data and CSRF token
      val request = FakeRequest(POST, baseURL + path)
        .withHeaders("Csrf-Token" -> "nocheck")
        .withSession(session.data.toSeq*)
        .withMultipartFormDataBody(multipartFormData)

      // Execute the request - route should work with multipart, compiler will choose the right Writeable
      val result = runIO(IO.fromFuture(IO {
        route(app, request).getOrElse(
          throw new RuntimeException(s"No route found for POST ${baseURL + path}")
        )
      }))

      result
    finally
      // Clean up temporary file
      if tempFile.exists() then tempFile.delete()

  override protected def createExamInstance(): CollaborativeExam =
    val externalExam = new CollaborativeExam()
    externalExam.setExternalRef(EXAM_HASH)
    externalExam.save()
    externalExam
