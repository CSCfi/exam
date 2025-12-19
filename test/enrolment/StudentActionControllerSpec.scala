// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.user.User
import org.joda.time.DateTime
import org.scalatest.BeforeAndAfterEach
import play.api.http.Status
import play.api.libs.json.JsArray
import services.json.JsonDeserializer

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
        e.setPeriodEnd(DateTime.now().plusYears(1))
        e.setState(Exam.State.PUBLISHED)
        e.save()
        e
      case None => fail(s"Exam with ID $examId not found")

    val user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    val machine = room.getExamMachines.get(0)
    machine.setIpAddress("127.0.0.1") // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.setMachine(machine)
    reservation.setUser(user)
    reservation.setStartAt(DateTime.now().minusMinutes(10))
    reservation.setEndAt(DateTime.now().plusMinutes(70))
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)
    enrolment.setReservation(reservation)
    enrolment.save()
    enrolment

  private def createExternalReservation(): ExternalReservation =
    val externalReservation = new ExternalReservation()
    externalReservation.setRoomInstruction("Room instruction")
    externalReservation.setRoomInstructionEN("Room instruction EN")
    externalReservation.setRoomInstructionSV("Room instruction SV")
    externalReservation.setMachineName("External machine")
    externalReservation.setRoomRef("room1234")
    externalReservation.setOrgRef("org1234")
    externalReservation.setRoomName("External Room")
    externalReservation.setRoomTz(TimeZone.getTimeZone("Europe/Helsinki").getID)
    externalReservation.save()
    externalReservation

  "StudentActionController" when:
    "getting enrolments for user" should:
      "return enrolments with external reservation" in:
        val (user, session) = runIO(loginAsStudent())
        setupTestData()

        createEnrolment(1L)
        val enrolment   = createEnrolment(2L)
        val reservation = enrolment.getReservation
        reservation.setMachine(null)
        reservation.setExternalReservation(createExternalReservation())
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
        val er                = externalEnrolment.getReservation.getExternalReservation
        er must not be null
        er.getRoomName must be("External Room")
        er.getMachineName must be("External machine")
        er.getOrgRef must be("org1234")
        er.getRoomRef must be("room1234")
        er.getRoomInstruction must be("Room instruction")
        er.getRoomInstructionEN must be("Room instruction EN")
        er.getRoomInstructionSV must be("Room instruction SV")
