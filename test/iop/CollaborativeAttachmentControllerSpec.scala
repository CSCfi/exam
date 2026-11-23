// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: The members of the EXAM Consortium
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

import java.util.concurrent.TimeUnit

class CollaborativeAttachmentControllerSpec
    extends BaseCollaborativeAttachmentSpec[CollaborativeExam]:

  private val baseURL = "/app/iop/collab/attachment"

  "CollaborativeAttachmentController" when:
    "downloading exam attachments" should:
      "allow teacher to download exam attachment" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val result = runIO(get(s"$baseURL/exam/${externalExam.id}", session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("GET", attachmentServlet)
        assertDownloadResult(result)

    "managing question attachments" should:
      "add attachment to question as teacher" in:
        val (_, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                        = runIO(loginAsTeacher())
        getExamSectionQuestion(
          examServlet.getExam,
          Some(examSectionQuestion.id)
        ).question.attachment = null
        val path = "/question"
        uploadAttachment(
          path,
          Map(
            "examId"     -> externalExam.id.toString,
            "questionId" -> examSectionQuestion.id.toString
          ),
          session
        )
        examServlet.getWaiter.tryAcquire(1, 10000, TimeUnit.MILLISECONDS) must be(true)
        assertLastCall("PUT", examServlet)
        val exam = examServlet.getExam
        val sq   = getExamSectionQuestion(exam, Some(examSectionQuestion.id))
        val attachment = Option(sq.question.attachment) match
          case Some(attachment) => attachment
          case None             => fail("Question attachment not set")
        attachment.externalId must be("abcdefg123456")
        attachment.fileName must be("test_image.png")

      "download question attachment as teacher" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val url    = s"$baseURL/exam/${externalExam.id}/question/${examSectionQuestion.id}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("GET", attachmentServlet)
        assertDownloadResult(result)

  private def assertLastCall(method: String, servlet: BaseServlet): Unit =
    servlet.getLastCallMethod must be(method)

  private def uploadAttachment(
      path: String,
      idParts: Map[String, String],
      session: play.api.mvc.Session
  ): Result =
    // Create a temporary file from the test image
    val tempFile = java.io.File.createTempFile("test_upload", ".png")
    java.nio.file.Files.copy(
      testImage.toPath,
      tempFile.toPath,
      java.nio.file.StandardCopyOption.REPLACE_EXISTING
    )
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
    externalExam.externalRef = EXAM_HASH
    externalExam.save()
    externalExam
