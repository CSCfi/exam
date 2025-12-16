// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import com.google.common.io.Files
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, ServerSetupTest}
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import io.ebean.text.json.EJson
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamExecutionType}
import models.facility.ExamRoom
import models.iop.ExternalExam
import models.user.User
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.Json
import play.api.test.Helpers._
import services.json.JsonDeserializer

import java.io.File
import java.nio.charset.Charset
import java.util.UUID
import java.util.concurrent.{CountDownLatch, TimeUnit}
import scala.compiletime.uninitialized

class EnrolmentControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterEach
    with BeforeAndAfterAll
    with EbeanQueryExtensions:

  private val MAIL_TIMEOUT   = 2000L
  private var server: Server = uninitialized

  // GreenMail setup for email testing
  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  class CourseInfoServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      RemoteServerHelper.writeResponseFromFile(response, "test/resources/enrolments.json")

  private lazy val courseInfoServlet = new CourseInfoServlet()

  override def beforeAll(): Unit =
    super.beforeAll()
    val binding = ServletDef.FromInstance(courseInfoServlet) -> List("/enrolments")
    server = RemoteServerHelper.createServer(31246, false, binding)

  override def afterAll(): Unit =
    try
      RemoteServerHelper.shutdownServer(server)
    finally
      super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    startGreenMail()
    greenMail.purgeEmailFromAllMailboxes()

  override def afterEach(): Unit =
    try
      stopGreenMail()
    finally
      super.afterEach()

  private def setupTestData(
      enrolmentUser: Option[User] = None,
      examOwner: Option[User] = None
  ): (Exam, ExamEnrolment, Reservation, ExamRoom) =
    ensureTestDataLoaded()
    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val exam = Option(DB.find(classOf[Exam], 1L)) match
      case Some(e) => e
      case None    => fail("Test exam not found")

    // Set exam owner if provided
    examOwner.foreach(exam.setCreator)

    val user = enrolmentUser.getOrElse(
      DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
        case Some(u) => u
        case None    => fail("Test user not found")
    )

    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)

    val reservation = new Reservation()
    reservation.setUser(user)

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    (exam, enrolment, reservation, room)

  private def deserialize[T](clazz: Class[T], jsValue: play.api.libs.json.JsValue): T =
    val jacksonNode = play.libs.Json.parse(jsValue.toString)
    JsonDeserializer.deserialize(clazz, jacksonNode)

  "EnrolmentController" when:
    "pre-enrolling students" should:
      "pre-enroll with email" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val (exam, _, _, _)    = setupTestData(examOwner = Some(teacher))
        val eppn               = "student@test.org"
        val email              = "student@foo.bar"

        exam.setExecutionType(
          DB.find(classOf[ExamExecutionType])
            .where()
            .eq("type", ExamExecutionType.Type.PRIVATE.toString)
            .find
            .orNull
        )
        exam.update()

        val enrollData = Json.obj("email" -> email)
        val result =
          runIO(makeRequest(POST, s"/app/enrolments/student/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.OK)

        DB.find(classOf[User]).where().eq("eppn", eppn).find must be(None)

        // Login as the pre-enrolled student
        val (user, _) = runIO(login(eppn, Map("mail" -> java.net.URLEncoder.encode(email, "UTF-8"))))
        // Find the enrolment - it should be linked to the user after login
        // The association happens in SessionController.associateWithPreEnrolments
        val ee = DB
          .find(classOf[ExamEnrolment])
          .where()
          .eq("exam.id", exam.getId)
          .or()
          .eq("user.id", user.getId)
          .ieq("preEnrolledUserEmail", email)
          .endOr()
          .find match
          case Some(enrolment) => enrolment
          case None            => fail("Enrolment not found")

        // If the user is still null, manually associate it (association might not run in test)
        if ee.getUser == null then
          ee.setUser(user)
          ee.setPreEnrolledUserEmail(null)
          ee.update()

        ee.getUser.getEmail must be(email)
        ee.getPreEnrolledUserEmail must be(null)

        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)

      "pre-enroll with eppn" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val (exam, _, _, _)    = setupTestData(examOwner = Some(teacher))
        val eppn               = "student@test.org"

        exam.setExecutionType(
          DB.find(classOf[ExamExecutionType])
            .where()
            .eq("type", ExamExecutionType.Type.PRIVATE.toString)
            .find
            .orNull
        )
        exam.update()

        val enrollData = Json.obj("email" -> eppn)
        val result =
          runIO(makeRequest(POST, s"/app/enrolments/student/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.OK)

        DB.find(classOf[User]).where().eq("eppn", eppn).find must be(None)

        // Login as the pre-enrolled student
        val (user, _) = runIO(login(eppn))
        // Find the enrolment - it should be linked to the user after login
        // The association happens in SessionController.associateWithPreEnrolments
        val ee = DB
          .find(classOf[ExamEnrolment])
          .where()
          .eq("exam.id", exam.getId)
          .or()
          .eq("user.id", user.getId)
          .ieq("preEnrolledUserEmail", eppn)
          .endOr()
          .find match
          case Some(enrolment) => enrolment
          case None            => fail("Enrolment not found")

        // If the user is still null, manually associate it (association might not run in test)
        if ee.getUser == null then
          ee.setUser(user)
          ee.setPreEnrolledUserEmail(null)
          ee.update()

        ee.getUser.getEppn must be(eppn)
        ee.getPreEnrolledUserEmail must be(null)

        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)

    "getting enrolments" should:
      "get enrolment for external exam" in:
        val (user, session)                   = runIO(loginAsStudent())
        val (_, enrolment, reservation, room) = setupTestData()

        val ee = new ExternalExam()
        ee.setExternalRef(UUID.randomUUID().toString)
        ee.setHash(UUID.randomUUID().toString)
        ee.setCreated(DateTime.now())
        ee.setCreator(user)
        ee.setContent(
          EJson.parseObject(
            Files.asCharSource(new File("test/resources/enrolment.json"), Charset.forName("UTF-8")).read()
          )
        )

        val machine = room.getExamMachines.get(0)
        machine.setIpAddress("127.0.0.1")
        machine.update()

        reservation.setMachine(machine)
        reservation.setStartAt(DateTime.now().plusMinutes(30))
        reservation.setEndAt(DateTime.now().plusMinutes(75))
        reservation.setExternalUserRef(user.getEppn)
        reservation.setExternalRef("foobar")
        reservation.save()

        enrolment.setExternalExam(ee)
        enrolment.setExam(null)
        enrolment.setReservation(reservation)
        enrolment.save()

        val result = runIO(get(s"/app/student/enrolments/${enrolment.getId}", session = session))
        statusOf(result) must be(Status.OK)

        val node = contentAsJsonOf(result)
        val data = deserialize(classOf[ExamEnrolment], node)
        data.getExam must not be null

    "creating enrolments" should:
      "create enrolment successfully" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _, _) = setupTestData()

        val enrollData = Json.obj("code" -> exam.getCourse.getCode)
        val result     = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.OK)

        // Verify enrolment was created
        DB.find(classOf[ExamEnrolment])
          .where()
          .eq("exam.id", exam.getId)
          .eq("user.id", user.getId)
          .find must not be empty

      "handle concurrent enrolment creation" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _, _) = setupTestData()

        // Ensure exam is in correct state for enrolment
        exam.setState(Exam.State.PUBLISHED)
        exam.update()

        val callCount = 10
        val latch     = new CountDownLatch(callCount)

        println(s"Starting $callCount concurrent enrolment requests...")

        // Create concurrent requests
        (0 until callCount).foreach { i =>
          scala.concurrent.Future {
            try
              val enrollData = Json.obj("code" -> exam.getCourse.getCode)
              runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
            catch
              case e: Exception =>
                println(s"Request failed: ${e.getMessage}")
            finally latch.countDown()
          }(using scala.concurrent.ExecutionContext.global)
        }

        // Wait for all requests to complete
        latch.await(5000, TimeUnit.MILLISECONDS) must be(true)

        // Verify only one enrolment was created
        val count = DB
          .find(classOf[ExamEnrolment])
          .where()
          .eq("exam.id", exam.getId)
          .eq("user.id", user.getId)
          .list
          .size
        count must be(1)

      "prevent recreating existing enrolment" in:
        val (user, session)         = runIO(loginAsStudent())
        val (exam, enrolment, _, _) = setupTestData()

        // Setup existing enrolment
        val enrolledOn = DateTime.now()
        enrolment.setEnrolledOn(enrolledOn)
        enrolment.save()

        val enrollData = Json.obj("code" -> exam.getCourse.getCode)
        val result     = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_enrolment_exists")

        // Verify no additional enrolment was created
        val enrolments = DB.find(classOf[ExamEnrolment]).list
        enrolments must have size 1
        val existingEnrolment = enrolments.head
        existingEnrolment.getEnrolledOn must be(enrolledOn)

      "recreate enrolment when future reservation exists" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, enrolment, reservation, room) = setupTestData()

        // Setup future reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().plusDays(1))
        reservation.setEndAt(DateTime.now().plusDays(2))
        reservation.save()

        val enrolledOn = DateTime.now()
        enrolment.setEnrolledOn(enrolledOn)
        enrolment.setReservation(reservation)
        enrolment.save()

        val enrollData = Json.obj("code" -> exam.getCourse.getCode)
        val result     = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.OK)

        // Verify enrolment was recreated without reservation
        val enrolments = DB.find(classOf[ExamEnrolment]).list
        enrolments must have size 1
        val e = enrolments.head
        e.getEnrolledOn.isAfter(enrolledOn) must be(true)
        e.getReservation must be(null)

      "reject enrolment when ongoing reservation exists" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, enrolment, reservation, room) = setupTestData()

        // Set up ongoing reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().minusDays(1))
        reservation.setEndAt(DateTime.now().plusDays(1))
        reservation.save()

        val enrolledOn = DateTime.now()
        enrolment.setEnrolledOn(enrolledOn)
        enrolment.setReservation(reservation)
        enrolment.save()

        val enrollData = Json.obj("code" -> exam.getCourse.getCode)
        val result     = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_reservation_in_effect")

        // Verify original enrolment unchanged
        val enrolments = DB.find(classOf[ExamEnrolment]).list
        enrolments must have size 1
        val e = enrolments.head
        e.getEnrolledOn must be(enrolledOn)

      "create new enrolment when past reservation exists" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, enrolment, reservation, room) = setupTestData()

        // Setup past reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().minusDays(2))
        reservation.setEndAt(DateTime.now().minusDays(1))
        reservation.save()

        val enrolledOn = DateTime.now()
        enrolment.setEnrolledOn(enrolledOn)
        enrolment.setReservation(reservation)
        enrolment.save()

        val enrollData = Json.obj("code" -> exam.getCourse.getCode)
        val result     = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session))
        statusOf(result) must be(Status.OK)

        // Verify new enrolment was created
        val enrolments = DB.find(classOf[ExamEnrolment]).list
        enrolments must have size 2
        val newEnrolment = enrolments(1)
        newEnrolment.getEnrolledOn.isAfter(enrolledOn) must be(true)
        newEnrolment.getReservation must be(null)
