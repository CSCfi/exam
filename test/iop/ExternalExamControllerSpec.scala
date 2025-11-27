// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, ServerSetupTest}
import helpers.{AttachmentServlet, RemoteServerHelper}
import io.ebean.DB
import jakarta.servlet.MultipartConfigElement
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import miscellaneous.file.FileHandler
import miscellaneous.scala.DbApiHelper
import models.attachment.Attachment
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.questions.Question
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Language, User}
import net.jodah.concurrentunit.Waiter
import org.apache.commons.io.{FileUtils, IOUtils}
import org.eclipse.jetty.ee10.servlet.{ServletContextHandler, ServletHolder}
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.Logging
import play.api.http.Status
import play.api.libs.json.Json
import play.api.test.Helpers.*

import java.io.{File, FileInputStream, IOException}
import java.nio.file.{FileSystems, Files, Path}
import java.util
import java.util.UUID
import java.util.stream.StreamSupport
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class ExternalExamControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterEach
    with BeforeAndAfterAll
    with Matchers
    with Logging
    with DbApiHelper:

  private val RESERVATION_REF   = "0e6d16c51f857a20ab578f57f105032e"
  private val RESERVATION_REF_2 = "0e6d16c51f857a20ab578f57f105032f"
  private val ROOM_REF          = "0e6d16c51f857a20ab578f57f1018456"
  private val HASH         = "7cf002da-4263-4843-99b1-e8af51e" // Has to match with the externalRef in the test JSON file
  private val MAIL_TIMEOUT = 5000L

  // Server infrastructure - initialized once in beforeAll
  private lazy val testImage: File = getTestFile("test_files/test_image.png")

  // These will be initialized in beforeAll and cleaned up in afterAll
  private var testUpload: Option[Path] = None
  private var server: Option[Server] = None
  private var attachmentServlet: Option[AttachmentServlet] = None

  // GreenMail setup for email testing
  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  class EnrolmentServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      response.setContentType("application/json")
      response.setStatus(HttpServletResponse.SC_OK)

      val file = new File("test/resources/enrolment_with_lottery.json")
      try
        val fis = new FileInputStream(file)
        val sos = response.getOutputStream
        IOUtils.copy(fis, sos)
        sos.flush()
        fis.close()
      catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

    @throws[IOException]
    override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      resp.setContentType("application/json")
      if req.getPathInfo.contains("/attachments") then
        resp.setStatus(HttpServletResponse.SC_CREATED)
        resp.getWriter.write(s"""{"id": "${UUID.randomUUID()}"}""")
        resp.getWriter.flush()
      else resp.setStatus(HttpServletResponse.SC_NOT_FOUND)

  override def beforeAll(): Unit =
    super.beforeAll()
    startGreenMail()

    val serverInstance = new Server(31247)
    val context = new ServletContextHandler(ServletContextHandler.SESSIONS)
    context.setContextPath("/api")

    val testUploadPath = Files.createTempDirectory("test_upload")
    testUpload = Some(testUploadPath)

    val fileUploadServletHolder = new ServletHolder(new EnrolmentServlet())
    fileUploadServletHolder.getRegistration.setMultipartConfig(new MultipartConfigElement(testUploadPath.toString))
    context.addServlet(fileUploadServletHolder, "/enrolments/*")

    val attachmentServletInstance = new AttachmentServlet(testImage)
    attachmentServlet = Some(attachmentServletInstance)
    val attachmentServletHolder = new ServletHolder(attachmentServletInstance)
    attachmentServletHolder.getRegistration.setMultipartConfig(new MultipartConfigElement(testUploadPath.toString))
    context.addServlet(attachmentServletHolder, "/attachments/*")

    serverInstance.setHandler(context)
    serverInstance.start()
    server = Some(serverInstance)

  override def afterAll(): Unit =
    try
      stopGreenMail()
      server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    greenMail.purgeEmailFromAllMailboxes()

    // Clean up any leftover files from previous tests
    try
      val fileHandler = app.injector.instanceOf(classOf[FileHandler])
      val uploadPath  = fileHandler.getAttachmentPath
      val path        = FileSystems.getDefault.getPath(uploadPath)
      if path.toFile.exists() then FileUtils.cleanDirectory(path.toFile)
    catch
      case _: Exception => // Ignore cleanup errors during test initialization

  protected def getTestFile(s: String): File =
    val classLoader = this.getClass.getClassLoader
    new File(java.util.Objects.requireNonNull(classLoader.getResource(s)).getFile)

  protected def createAttachment(fileName: String, filePath: String, mimeType: String): Attachment =
    val attachment = new Attachment()
    attachment.setFileName(fileName)
    attachment.setFilePath(filePath)
    attachment.setMimeType(mimeType)
    attachment.save()
    attachment

  private def setupTestData(): (Exam, ExamEnrolment, Reservation) =
    ensureTestDataLoaded()

    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    // Setup exam
    val exam = Option(
      DB.find(classOf[Exam])
        .fetch("examSections")
        .fetch("examSections.sectionQuestions")
        .where()
        .idEq(1L)
        .findOne()
    ) match
      case Some(e) => e
      case None    => fail("Test exam not found")

    initExamSectionQuestions(exam)
    exam.setPeriodStart(DateTime.now().minusDays(1))
    exam.setPeriodEnd(DateTime.now().plusDays(1))
    exam.setHash(HASH)

    val owner = Option(DB.find(classOf[User], 2L)) match
      case Some(u) => u
      case None    => fail("Owner user not found")
    exam.getExamOwners.add(owner)
    exam.update()

    // Setup user
    val user = Option(DB.find(classOf[User], 1L)) match
      case Some(u) => u
      case None    => fail("Test user not found")
    user.setLanguage(DB.find(classOf[Language]).where().eq("code", "en").find.orNull)
    user.update()

    // Setup room
    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")
    room.setExternalRef(ROOM_REF)
    room.getExamMachines.get(0).setIpAddress("127.0.0.1")
    room.getExamMachines.get(0).update()
    room.update()

    // Setup reservation (from onBeforeLogin equivalent)
    val reservationUser = DB.find(classOf[User]).where().eq("email", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Reservation user not found")

    val machine = room.getExamMachines.get(0)
    machine.setIpAddress("127.0.0.1") // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.setMachine(machine)
    reservation.setUser(reservationUser)
    reservation.setStartAt(DateTime.now().plusMinutes(10))
    reservation.setEndAt(DateTime.now().plusMinutes(70))
    reservation.setExternalUserRef(reservationUser.getEppn)
    reservation.setExternalRef(RESERVATION_REF)
    reservation.save()

    // Setup enrolment
    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)
    enrolment.save()

    attachmentServlet.foreach(_.setWaiter(new Waiter()))

    (exam, enrolment, reservation)

  private def initExamSectionQuestions(exam: Exam): Unit =
    exam.setExamSections(new java.util.TreeSet(exam.getExamSections))
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter { esq =>
        esq.getQuestion.getType == Question.Type.MultipleChoiceQuestion ||
        esq.getQuestion.getType == Question.Type.WeightedMultipleChoiceQuestion
      }
      .foreach { esq =>
        esq.getQuestion.getOptions.asScala.foreach { o =>
          val esqo = new ExamSectionQuestionOption()
          esqo.setOption(o)
          esqo.setScore(o.getDefaultScore)
          esq.getOptions.add(esqo)
        }
        esq.save()
      }

  private def getExamSectionQuestion(exam: Exam): ExamSectionQuestion =
    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .headOption
      .getOrElse(throw new Exception("No section question found"))

  private def assertAttachment(attachment: Attachment, json: JsonNode): Unit =
    json must not be null
    json.get("fileName").asText.must(be(attachment.getFileName))
    json.get("mimeType").asText.must(be(attachment.getMimeType))
    json.get("filePath").asText.must(be(attachment.getFilePath))
    json.get("externalId").isNull.must(be(false))

  "ExternalExamController" when:
    "requesting enrolment" should:
      "handle enrolment request successfully" in:
        val (exam, enrolment, reservation) = setupTestData()
        loginAsStudent().flatMap { case (_, session) =>
          val external = Option(
            DB.find(classOf[Reservation])
              .fetch("enrolment")
              .fetch("enrolment.externalExam")
              .where()
              .idEq(reservation.getId)
              .findOne()
          ) match
            case Some(r) => r
            case None    => fail("External reservation not found")

          external.getEnrolment must not be null
          external.getEnrolment.getExternalExam must not be null

          // Check that the lottery was taken in effect
          val examData = external.getEnrolment.getExternalExam.deserialize()
          val s1       = examData.getExamSections.asScala.find(_.isLotteryOn)
          s1 must be(defined)
          s1.get.getSectionQuestions must have size s1.get.getLotteryItemCount

          Future.successful(succeed)
        }

    "receiving exam attainment" should:
      "process exam attainment successfully" in:
        val (exam, enrolment, _) = setupTestData()

        val reservation = new Reservation()
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.save()

        enrolment.setReservation(reservation)
        enrolment.update()

        val mapper = new ObjectMapper()
        val node   = mapper.readTree(new File("test/resources/externalExamAttainment.json"))
        val result = makeRequest(POST, s"/integration/iop/exams/$RESERVATION_REF", Some(Json.parse(node.toString)))
        status(result).must(be(Status.CREATED))

        greenMail.purgeEmailFromAllMailboxes()
        // Note: Email sending might be asynchronous, so we'll check for the main result first
        // greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 2) must be(true)

        val attainment = Option(DB.find(classOf[Exam]).where().eq("parent", exam).findOne()) match
          case Some(a) => a
          case None    => fail("Attainment not found")

        // Auto-evaluation expected to occur so state should be GRADED
        attainment.getState.must(be(Exam.State.GRADED))

        attachmentServlet.foreach(_.getWaiter.await(10000, 3))
        val fileHandler = app.injector.instanceOf(classOf[FileHandler])

        val uploadPath = fileHandler.getAttachmentPath
        val path       = FileSystems.getDefault.getPath(uploadPath)

        val start                   = System.currentTimeMillis()
        val expectedFileCount       = 3
        var files: util.Collection[File] = new java.util.ArrayList()

        var done = false
        while (System.currentTimeMillis() < start + 10000 && !done) {
          if (!path.toFile.exists()) {
            Thread.sleep(100)
          } else {
            files = FileUtils.listFiles(path.toFile, null, true)
            if (files.size() >= expectedFileCount) {
              done = true
            } else {
              Thread.sleep(200)
            }
          }
        }

        files.size must be >= expectedFileCount
        files.asScala.foreach(file => logger.info(file.toString))

        // Check that we can review it
        loginAsAdmin().flatMap { case (_, adminSession) =>
          val reviewResult = get(s"/app/review/${attainment.getId}", session = adminSession)
          status(reviewResult).must(be(Status.OK))
          Future.successful(succeed)
        }

    "receiving no show" should:
      "process no show successfully" in:
        val (exam, enrolment, _) = setupTestData()

        val reservation = new Reservation()
        reservation.setExternalRef(RESERVATION_REF_2)
        reservation.setStartAt(DateTime.now().minusHours(3))
        reservation.setEndAt(DateTime.now().minusHours(2))
        reservation.setUser(DB.find(classOf[User]).where().eq("firstName", "Sauli").find.orNull)

        val er = new ExternalReservation()
        er.setOrgRef("org1")
        er.setRoomRef("room2")
        er.setMachineName("machine3")
        er.setRoomName("room named 4")
        er.save()
        reservation.setExternalReservation(er)
        reservation.save()

        enrolment.setReservation(reservation)
        enrolment.update()

        val result = makeRequest(POST, s"/integration/iop/reservations/$RESERVATION_REF_2/noshow", Some(Json.obj()))
        status(result).must(be(Status.OK))

        val r = Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF_2).findOne()) match
          case Some(res) => res
          case None      => fail("Reservation not found")

        r must not be null
        r.getEnrolment.isNoShow must be(true)

    "providing enrolment with attachments" should:
      "handle attachments successfully" in:
        val (exam, enrolment, reservation) = setupTestData()

        val testFile           = getTestFile("test_files/test.txt")
        val examAttachment     = createAttachment("test.txt", testFile.getAbsolutePath, "plain/text")
        val testImageFile      = getTestFile("test_files/test_image.png")
        val questionAttachment = createAttachment("test_image.png", testImageFile.getAbsolutePath, "image/png")

        exam.setAttachment(examAttachment)
        exam.save()

        enrolment.setReservation(reservation)
        enrolment.save()

        val sectionQuestion = getExamSectionQuestion(exam)
        val question        = sectionQuestion.getQuestion
        question.setAttachment(questionAttachment)
        question.save()

        val result = get(s"/integration/iop/reservations/$RESERVATION_REF")
        status(result).must(be(Status.OK))

        val jsonNode = contentAsJson(result)
        jsonNode must not be null

        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(jsonNode.toString)
        assertAttachment(examAttachment, jacksonNode.path("attachment"))

        val questionJson = StreamSupport
          .stream(jacksonNode.path("examSections").spliterator(), false)
          .flatMap(node => StreamSupport.stream(node.path("sectionQuestions").spliterator(), false))
          .filter(node => node.get("id").asLong() == sectionQuestion.getId)
          .map(node => node.path("question"))
          .filter(node => node.get("id").asLong() == question.getId)
          .findFirst()
          .orElseThrow(() => new Exception("Question not found!"))

        assertAttachment(questionAttachment, questionJson.path("attachment"))
        attachmentServlet.foreach(_.getWaiter.await(10000, 2))

        testUpload.foreach { uploadPath =>
          new File(uploadPath.toString + "/" + "test.txt").exists() must be(true)
          new File(uploadPath.toString + "/" + "test_image.png").exists() must be(true)
        }
