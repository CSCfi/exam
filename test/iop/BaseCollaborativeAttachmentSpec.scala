// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import helpers.*
import io.ebean.DB
import jakarta.servlet.MultipartConfigElement
import models.attachment.Attachment
import models.exam.{Exam, ExamExecutionType}
import models.questions.EssayAnswer
import models.sections.ExamSectionQuestion
import net.jodah.concurrentunit.Waiter
import org.apache.commons.io.FileUtils
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.stream.Materializer
import org.apache.pekko.util.Timeout
import org.eclipse.jetty.ee10.servlet.{ServletContextHandler, ServletHolder}
import org.eclipse.jetty.server.Server
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.Logger
import play.api.mvc.Result
import play.api.test.Helpers.*

import java.io.{File, IOException}
import java.nio.file.{Files, Path}
import java.util.{Base64, Objects}
import scala.concurrent.Await
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

trait BaseCollaborativeAttachmentSpec[T]
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with Matchers:

  private val logger = Logger(this.getClass)

  protected val EXAM_HASH = "0e6d16c51f857a20ab578f57f105032e"

  // Server infrastructure - initialized once in beforeAll
  private lazy val server: Server                         = new Server(31247)
  private lazy val testUpload: Path                       = Files.createTempDirectory("test_upload")
  protected lazy val testImage: File                      = getTestFile("test_files/test_image.png")
  protected lazy val attachmentServlet: AttachmentServlet = new AttachmentServlet(testImage)
  protected lazy val examServlet: ExamServlet             = new ExamServlet()

  // Test data - managed through setupTestData() return values to avoid mutable state

  override def beforeAll(): Unit =
    super.beforeAll()

    val context = new ServletContextHandler(ServletContextHandler.SESSIONS)
    context.setContextPath("/api")

    val fileUploadServletHolder = new ServletHolder(attachmentServlet)
    fileUploadServletHolder.getRegistration.setMultipartConfig(new MultipartConfigElement(testUpload.toString))
    context.addServlet(fileUploadServletHolder, "/attachments/*")
    context.addServlet(new ServletHolder(examServlet), "/exams/*")

    server.setHandler(context)
    server.start()

  override def afterAll(): Unit =
    try
      helpers.RemoteServerHelper.shutdownServer(server)
    finally
      super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    // Database setup moved to setupTestData() method to avoid initialization issues

  override def afterEach(): Unit =
    try
      logger.info(s"Cleaning test upload directory: ${testUpload.toString}")
      FileUtils.deleteDirectory(testUpload.toFile)
    catch
      case e: IOException =>
        logger.error("Test upload directory delete failed!", e)
    finally super.afterEach()

  protected def assertDownloadResult(result: Result): Unit =
    headerOf(result, "Content-Disposition") must be(
      Some("attachment; filename*=UTF-8''\"test_image.png\"")
    )

    val actorSystem                = ActorSystem.create("TestSystem")
    implicit val mat: Materializer = Materializer.createMaterializer(actorSystem)
    try
      implicit val timeout: Timeout = Timeout(5.seconds)
      // Use the materializer we created instead of relying on Play's
      val contentBytes = Await.result(result.body.consumeData, 5.seconds)
      val content      = contentBytes.utf8String
      val decoded      = Base64.getDecoder.decode(content)
      val f            = new File(testUpload.toString + "/image.png")
      FileUtils.writeByteArrayToFile(f, decoded)
      FileUtils.contentEquals(f, testImage) must be(true)
    finally actorSystem.terminate()

  protected def getTestFile(s: String): File =
    val classLoader = this.getClass.getClassLoader
    new File(Objects.requireNonNull(classLoader.getResource(s)).getFile)

  protected def createAttachment(fileName: String, filePath: String, mimeType: String): Attachment =
    val attachment = new Attachment()
    attachment.setFileName(fileName)
    attachment.setFilePath(filePath)
    attachment.setMimeType(mimeType)
    attachment.save()
    attachment

  protected def getExamSectionQuestion(exam: Exam): ExamSectionQuestion =
    getExamSectionQuestion(exam, None)

  protected def getExamSectionQuestion(exam: Exam, id: Option[Long]): ExamSectionQuestion =
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .find(sq => id.isEmpty || sq.getId == id.get)
      .getOrElse(throw new Exception("Null section question"))

  /** Setup test data including exam, attachments, and external exam. Returns a tuple of (exam, examSectionQuestion,
    * externalExam) to avoid mutable state. Call this method at the beginning of each test that needs database access.
    */
  protected def setupTestData(): (Exam, ExamSectionQuestion, T) =
    ensureTestDataLoaded()

    val exam = Option(DB.find(classOf[Exam], 1L)) match
      case Some(e) => e
      case None    => fail("Test exam not found")

    exam.setExecutionType(Option(DB.find(classOf[ExamExecutionType], 1L)).orNull)
    exam.setExternal(true)

    val examAttachment = createAttachment("test_image.png", testImage.getAbsolutePath, "image/png")
    examAttachment.setExternalId("ab123fcdgkk")
    exam.setAttachment(examAttachment)
    exam.save()

    val examSectionQuestion = getExamSectionQuestion(exam)

    val answer = new EssayAnswer()
    answer.setAnswer("Answer content")
    answer.save()
    examSectionQuestion.setEssayAnswer(answer)

    val question           = examSectionQuestion.getQuestion
    val questionAttachment = createAttachment("test_image.png", testImage.getAbsolutePath, "image/png")
    questionAttachment.setExternalId("9284774jdfjdfk")
    question.setAttachment(questionAttachment)
    question.save()

    val externalExam = createExamInstance()

    // Serialize the exam data into the external exam (needed for some tests)
    try
      externalExam match
        case extExam: models.iop.ExternalExam => extExam.serialize(exam)
        case _                                => // CollaborativeExam doesn't need serialization
    catch
      case e: IOException =>
        throw new RuntimeException(e)

    attachmentServlet.setWaiter(new Waiter())
    examServlet.setExam(exam)
    examServlet.setWaiter(new Waiter())

    (exam, examSectionQuestion, externalExam)

  // Abstract method to be implemented by subclasses - returns the created external exam
  protected def createExamInstance(): T
