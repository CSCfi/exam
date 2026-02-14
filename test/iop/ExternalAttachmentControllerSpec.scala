// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import cats.effect.IO
import io.ebean.DB
import models.iop.ExternalExam
import play.api.http.Status
import play.api.libs.Files
import play.api.mvc.{MultipartFormData, Result, Session}
import play.api.test.FakeRequest
import play.api.test.Helpers.{POST, route, writeableOf_AnyContentAsMultipartForm}

class ExternalAttachmentControllerSpec extends BaseCollaborativeAttachmentSpec[ExternalExam]:

  "ExternalAttachmentController" when:
    "downloading exam attachments" should:
      "allow teacher to download exam attachment" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (_, session)                              = runIO(loginAsTeacher())
        val result = runIO(requestExamAttachment(Status.OK, session))
        assertLastCall("GET")
        assertDownloadResult(result)

      "handle student download with proper permissions" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                           = runIO(loginAsStudent())

        // First request should fail (NOT_FOUND)
        runIO(requestExamAttachment(Status.NOT_FOUND, session))

        // Set user as creator and try again
        externalExam.setCreator(user)
        externalExam.save()

        // Second request should succeed
        val result = runIO(requestExamAttachment(Status.OK, session))
        assertLastCall("GET")
        assertDownloadResult(result)

    "downloading question attachments" should:
      "allow teacher to download question attachment" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                           = runIO(loginAsTeacher())
        val url    = s"/app/iop/attachment/exam/$EXAM_HASH/question/${examSectionQuestion.getId}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("GET")
        assertDownloadResult(result)

    "managing question answer attachments" should:
      "add attachment to question answer as student" in:
        val (exam, examSectionQuestion, externalExam) = setupTestData()
        val (user, session)                           = runIO(loginAsStudent())
        externalExam.setCreator(user)
        externalExam.save()

        val result = uploadAttachment(
          "/app/iop/attachment/question/answer",
          Map(
            "examId"     -> EXAM_HASH,
            "questionId" -> examSectionQuestion.getId.toString
          ),
          session
        )
        statusOf(result) must be(Status.CREATED)
        assertLastCall("POST")

        DB.refresh(externalExam)
        val e  = externalExam.deserialize()
        val sq = getExamSectionQuestion(e, Some(examSectionQuestion.getId))
        Option(sq.getEssayAnswer) match
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
        externalExam.setCreator(user)
        externalExam.save()

        val essayAnswer = examSectionQuestion.getEssayAnswer
        val attachment  = createAttachment("test_image.png", testImage.getAbsolutePath, "image/png")
        attachment.setExternalId("abcdefg12345")
        essayAnswer.setAttachment(attachment)
        externalExam.serialize(exam)

        val url    = s"/app/iop/attachment/question/${examSectionQuestion.getId}/answer/$EXAM_HASH"
        val result = runIO(delete(url, session = session))
        statusOf(result) must be(Status.OK)
        assertLastCall("DELETE")

        DB.refresh(externalExam)
        val e  = externalExam.deserialize()
        val sq = getExamSectionQuestion(e, Some(examSectionQuestion.getId))
        Option(sq.getEssayAnswer).map(_.getAttachment) must be(defined)

  private def requestExamAttachment(expectedStatus: Int, session: Session): IO[Result] =
    for
      result <- get(s"/app/iop/attachment/exam/$EXAM_HASH", session = session)
      _ <- IO {
        statusOf(result) must be(expectedStatus)
      }
    yield result

  private def assertLastCall(method: String): Unit =
    attachmentServlet.getLastCallMethod must be(method)

  private def uploadAttachment(
      url: String,
      idParts: Map[String, String],
      session: Session
  ): Result =
    val tempFile = java.io.File.createTempFile("test_upload", ".png")
    java.nio.file.Files.copy(
      testImage.toPath,
      tempFile.toPath,
      java.nio.file.StandardCopyOption.REPLACE_EXISTING
    )
    val temporaryFile = Files.SingletonTemporaryFileCreator.create(tempFile.toPath)

    try
      val filePart = MultipartFormData.FilePart(
        key = "file",
        filename = "test_image.png",
        contentType = Some("image/png"),
        ref = temporaryFile
      )
      val dataParts = idParts.map { case (key, value) => key -> Seq(value) }
      val multipartFormData = MultipartFormData(
        dataParts = dataParts,
        files = Seq(filePart),
        badParts = Seq.empty
      )
      val request = FakeRequest(POST, url)
        .withHeaders("Csrf-Token" -> "nocheck")
        .withSession(session.data.toSeq*)
        .withMultipartFormDataBody(multipartFormData)
      runIO(IO.fromFuture(IO {
        route(app, request).getOrElse(throw new RuntimeException(s"No route found for POST $url"))
      }))
    finally
      if tempFile.exists() then tempFile.delete()

  override protected def createExamInstance(): ExternalExam =
    val externalExam = new ExternalExam()
    externalExam.setHash(EXAM_HASH)
    externalExam.save()
    externalExam
