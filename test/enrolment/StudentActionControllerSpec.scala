// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.{Exam, ExamState}
import models.facility.ExamRoom
import models.user.User
import org.scalatest.BeforeAndAfterEach
import play.api.http.Status
import play.api.libs.json.JsArray
import services.json.JsonDeserializer

import java.time.{Duration, Instant}
import java.util.TimeZone

class StudentActionControllerSpec extends BaseIntegrationSpec with BeforeAndAfterEach
    with EbeanQueryExtensions:

  override def beforeEach(): Unit =
    super.beforeEach()

  private def setupTestData(): Unit =
    ensureTestDataLoaded()
    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

  private def deserialize[T](clazz: Class[T], jsValue: play.api.libs.json.JsValue): T =
    val jacksonNode = play.libs.Json.parse(jsValue.toString)
    JsonDeserializer.deserialize(clazz, jacksonNode)

  private def createEnrolment(examId: Long): ExamEnrolment =
    val exam = Option(DB.find(classOf[Exam], examId)) match
      case Some(e) =>
        e.periodEnd = Instant.now().plus(Duration.ofDays(365))
        e.state = ExamState.PUBLISHED
        e.save()
        e
      case None => fail(s"Exam with ID $examId not found")

    val user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    val machine = room.examMachines.get(0)
    machine.ipAddress = "127.0.0.1" // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.machine = machine
    reservation.user = user
    reservation.startAt = Instant.now().minus(Duration.ofMinutes(10))
    reservation.endAt = Instant.now().plus(Duration.ofMinutes(70))
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.exam = exam
    enrolment.user = user
    enrolment.reservation = reservation
    enrolment.save()
    enrolment

  private def createExternalReservation(): ExternalReservation =
    val externalReservation = new ExternalReservation()
    externalReservation.roomInstruction = "Room instruction"
    externalReservation.roomInstructionEN = "Room instruction EN"
    externalReservation.roomInstructionSV = "Room instruction SV"
    externalReservation.machineName = "External machine"
    externalReservation.roomRef = "room1234"
    externalReservation.orgRef = "org1234"
    externalReservation.roomName = "External Room"
    externalReservation.roomTz = TimeZone.getTimeZone("Europe/Helsinki").getID
    externalReservation.save()
    externalReservation

  "StudentActionController" when:
    "getting enrolments for user" should:
      "return enrolments with external reservation" in:
        val (user, session) = runIO(loginAsStudent())
        setupTestData()

        createEnrolment(1L)
        val enrolment   = createEnrolment(2L)
        val reservation = enrolment.reservation
        reservation.machine = null
        reservation.externalReservation = createExternalReservation()
        reservation.save()

        // Execute
        val result = runIO(get("/app/student/enrolments", session = session))
        statusOf(result) must be(Status.OK)

        // Verify
        val node = contentAsJsonOf(result)
        node.isInstanceOf[JsArray] must be(true)
        val nodes = node.as[JsArray]
        nodes.value must have size 2

        val external = nodes.value
          .find(n => (n \ "exam" \ "id").as[Long] == 2L)
          .getOrElse(fail("External enrolment not found"))

        val externalEnrolment = deserialize(classOf[ExamEnrolment], external)
        val er                = externalEnrolment.reservation.externalReservation
        er must not be null
        er.roomName must be("External Room")
        er.machineName must be("External machine")
        er.orgRef must be("org1234")
        er.roomRef must be("room1234")
        er.roomInstruction must be("Room instruction")
        er.roomInstructionEN must be("Room instruction EN")
        er.roomInstructionSV must be("Room instruction SV")
