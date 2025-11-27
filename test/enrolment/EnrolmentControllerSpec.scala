// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import com.google.common.io.Files
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, ServerSetupTest}
import helpers.RemoteServerHelper
import io.ebean.DB
import io.ebean.text.json.EJson
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import miscellaneous.json.JsonDeserializer
import miscellaneous.scala.DbApiHelper
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
import play.api.test.Helpers.*

import java.io.File
import java.nio.charset.Charset
import java.util.UUID
import java.util.concurrent.{CountDownLatch, TimeUnit}
import scala.compiletime.uninitialized

class EnrolmentControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterEach
    with BeforeAndAfterAll
    with DbApiHelper:

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

  override def beforeAll(): Unit =
    super.beforeAll()
    server = RemoteServerHelper.createAndStartServer(31246,Map(classOf[CourseInfoServlet] -> List("/enrolments")))

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

  private def setupTestData(): (Exam, ExamEnrolment, Reservation, ExamRoom) =
    ensureTestDataLoaded()
    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val exam = Option(DB.find(classOf[Exam], 1L)) match
      case Some(e) => e
      case None    => fail("Test exam not found")

    val user = Option(DB.find(classOf[User], 5L)) match
      case Some(u) => u
      case None    => fail("Test user not found")

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
        loginAsTeacher().map { case (teacher, session) =>
          val (exam, _, _, _) = setupTestData()
          val eppn            = "student@test.org"
          val email           = "student@foo.bar"

          exam.setExecutionType(
            DB.find(classOf[ExamExecutionType])
              .where()
              .eq("type", ExamExecutionType.Type.PRIVATE.toString)
              .find
              .orNull
          )
          exam.update()

          val enrollData = Json.obj("email" -> email)
          val result = makeRequest(POST, s"/app/enrolments/student/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.OK)

          DB.find(classOf[User]).where().eq("eppn", eppn).find must be(None)

          // Login as the pre-enrolled student
          login(eppn, Map("mail" -> email)).map { case (user, _) =>
            val ee = Option(DB.find(classOf[ExamEnrolment], exam.getExamEnrolments.get(0).getId)) match
              case Some(enrolment) => enrolment
              case None            => fail("Enrolment not found")

            ee.getUser.getEmail must be(email)
            ee.getPreEnrolledUserEmail must be(null)

            greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
          }
        }

      "pre-enroll with eppn" in:
        loginAsTeacher().map { case (teacher, session) =>
          val (exam, _, _, _) = setupTestData()
          val eppn            = "student@test.org"

          exam.setExecutionType(
            DB.find(classOf[ExamExecutionType])
              .where()
              .eq("type", ExamExecutionType.Type.PRIVATE.toString)
              .find
              .orNull
          )
          exam.update()

          val enrollData = Json.obj("email" -> eppn)
          val result = makeRequest(POST, s"/app/enrolments/student/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.OK)

          DB.find(classOf[User]).where().eq("eppn", eppn).find must be(None)

          // Login as the pre-enrolled student
          login(eppn).map { case (user, _) =>
            val ee = Option(DB.find(classOf[ExamEnrolment], exam.getExamEnrolments.get(0).getId)) match
              case Some(enrolment) => enrolment
              case None            => fail("Enrolment not found")

            ee.getUser.getEppn must be(eppn)
            ee.getPreEnrolledUserEmail must be(null)

            greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
          }
        }

    "getting enrolments" should:
      "get enrolment for external exam" in:
        loginAsStudent().map { case (user, session) =>
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

          val result = get(s"/app/student/enrolments/${enrolment.getId}", session = session)
          status(result) must be(Status.OK)

          val node = contentAsJson(result)
          val data = deserialize(classOf[ExamEnrolment], node)
          data.getExam must not be null
        }

    "creating enrolments" should:
      "create enrolment successfully" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _, _) = setupTestData()

          val enrollData = Json.obj("code" -> exam.getCourse.getCode)
          val result     = makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.OK)

          // Verify enrolment was created
          DB.find(classOf[ExamEnrolment])
            .where()
            .eq("exam.id", exam.getId)
            .eq("user.id", user.getId)
            .find must not be empty
        }

      "handle concurrent enrolment creation" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _, _) = setupTestData()
          val callCount       = 10
          val latch           = new CountDownLatch(callCount)

          println(s"Starting $callCount concurrent enrolment requests...")

          // Create concurrent requests
          (0 until callCount).foreach { i =>
            scala.concurrent.Future {
              try
                val enrollData = Json.obj("code" -> exam.getCourse.getCode)
                makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
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
        }

      "prevent recreating existing enrolment" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, enrolment, _, _) = setupTestData()

          // Setup existing enrolment
          val enrolledOn = DateTime.now()
          enrolment.setEnrolledOn(enrolledOn)
          enrolment.save()

          val enrollData = Json.obj("code" -> exam.getCourse.getCode)
          val result     = makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.FORBIDDEN)
          contentAsString(result) must be("i18n_error_enrolment_exists")

          // Verify no additional enrolment was created
          val enrolments = DB.find(classOf[ExamEnrolment]).list
          enrolments must have size 1
          val existingEnrolment = enrolments.head
          existingEnrolment.getEnrolledOn must be(enrolledOn)
        }

      "recreate enrolment when future reservation exists" in:
        loginAsStudent().map { case (user, session) =>
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
          val result     = makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.OK)

          // Verify enrolment was recreated without reservation
          val enrolments = DB.find(classOf[ExamEnrolment]).list
          enrolments must have size 1
          val e = enrolments.head
          e.getEnrolledOn.isAfter(enrolledOn) must be(true)
          e.getReservation must be(null)
        }

      "reject enrolment when ongoing reservation exists" in:
        loginAsStudent().map { case (user, session) =>
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
          val result     = makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.FORBIDDEN)
          contentAsString(result) must be("i18n_reservation_in_effect")

          // Verify original enrolment unchanged
          val enrolments = DB.find(classOf[ExamEnrolment]).list
          enrolments must have size 1
          val e = enrolments.head
          e.getEnrolledOn must be(enrolledOn)
        }

      "create new enrolment when past reservation exists" in:
        loginAsStudent().map { case (user, session) =>
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
          val result     = makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrollData), session = session)
          status(result) must be(Status.OK)

          // Verify new enrolment was created
          val enrolments = DB.find(classOf[ExamEnrolment]).list
          enrolments must have size 2
          val newEnrolment = enrolments(1)
          newEnrolment.getEnrolledOn.isAfter(enrolledOn) must be(true)
          newEnrolment.getReservation must be(null)
        }
