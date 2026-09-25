// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper.ServletDef
import helpers.{ExamServlet, RemoteServerHelper}
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamState}
import models.iop.CollaborativeExam
import models.user.User
import org.apache.commons.io.IOUtils
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.Application
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.{JsArray, JsValue, Json}
import play.api.test.Helpers.*
import services.datetime.{AppClock, FixedAppClock}

/** Covers the student-facing endpoint used for booking a visit to another organisation for a
  * collaborative exam. The stand-in for XM is bound to a wildcard path on purpose, so that a
  * request carrying the organisation and facility refs in the wrong order still gets recorded
  * instead of merely bouncing off Jetty as a 404.
  */
class CollaborativeExternalCalendarControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with Matchers
    with EbeanQueryExtensions:

  private val ORG_REF         = "thisissomeorgref"
  private val ROOM_REF        = "0e6d16c51f857a20ab578f57f1018456"
  private val RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e"
  private val EXAM_REF        = "9a1e5d3a8ff7a20ab578f57f1018abcd"
  private val PORT            = 31248

  // Anchored to today at 10:00, same rationale as in ExternalCalendarInterfaceSpec: keeps the
  // time-of-day within working hours while staying well clear of midnight
  private val fixedNow: DateTime = DateTime.now().withTimeAtStartOfDay().plusHours(10)

  private class ReservationServlet extends HttpServlet:
    @volatile var lastUri: Option[String]   = None
    @volatile var lastBody: Option[JsValue] = None
    @volatile var responseStatus: Int       = HttpServletResponse.SC_CREATED
    @volatile var errorMessage: String      = "i18n_no_machines_available"

    def reset(): Unit =
      lastUri = None
      lastBody = None
      responseStatus = HttpServletResponse.SC_CREATED
      errorMessage = "i18n_no_machines_available"

    override def doPost(request: HttpServletRequest, response: HttpServletResponse): Unit =
      lastUri = Some(request.getRequestURI)
      lastBody = Some(Json.parse(IOUtils.toByteArray(request.getInputStream)))
      if responseStatus != HttpServletResponse.SC_CREATED then
        RemoteServerHelper.writeJsonResponse(
          response,
          Json.obj("message" -> errorMessage),
          responseStatus
        )
      else
        val room = Json.obj(
          "name"              -> "Room 1",
          "roomCode"          -> "R1",
          "localTimezone"     -> "Europe/Helsinki",
          "roomInstructionEN" -> "information in English here",
          "buildingName"      -> "B1",
          "mailAddress" -> Json.obj(
            "city"   -> "Paris",
            "street" -> "123 Rue Monet",
            "zip"    -> "1684"
          )
        )
        val reservation = Json.obj(
          "id"      -> RESERVATION_REF,
          "start"   -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(1)),
          "end"     -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(2)),
          "orgName" -> "Remote University",
          "orgCode" -> "RU",
          "machine" -> Json.obj("name" -> "Machine 1", "room" -> room)
        )
        RemoteServerHelper.writeJsonResponse(
          response,
          reservation,
          HttpServletResponse.SC_CREATED
        )

  private val reservationServlet     = new ReservationServlet()
  private val examServlet            = new ExamServlet()
  private var server: Option[Server] = None

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .configure(Map("exam.integration.iop.host" -> s"http://localhost:$PORT"))
      .overrides(bind[AppClock].toInstance(FixedAppClock(fixedNow)))
      .build()

  override def beforeAll(): Unit =
    super.beforeAll()
    val bindings = Seq(
      ServletDef.FromInstance(reservationServlet) -> List("/api/organisations/*"),
      ServletDef.FromInstance(examServlet)        -> List("/api/exams/*")
    )
    server = Some(RemoteServerHelper.createServer(PORT, false, bindings*))

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    reservationServlet.reset()

  private def setupCollaborativeExam(withEnrolment: Boolean = true): (CollaborativeExam, User) =
    ensureTestDataLoaded()
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val student = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Student user not found")

    val exam = Option(
      DB.find(classOf[Exam]).fetch("examSections").where().idEq(1L).findOne()
    ) match
      case Some(e) => e
      case None    => fail("Test exam not found")

    exam.state = ExamState.PUBLISHED
    exam.periodStart = fixedNow.minusDays(1)
    exam.periodEnd = fixedNow.plusDays(1)
    exam.update()

    // The exam lives in XM for real; here the stand-in serves the local one back
    examServlet.setExam(exam)

    val ce = new CollaborativeExam()
    ce.externalRef = EXAM_REF
    ce.save()

    if withEnrolment then
      val enrolment = new ExamEnrolment()
      enrolment.collaborativeExam = ce
      enrolment.user = student
      enrolment.enrolledOn = fixedNow.minusDays(1)
      enrolment.save()

    (ce, student)

  private def reservationRequest(examId: Long): JsValue = Json.obj(
    "start"      -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(1)),
    "end"        -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(2)),
    "examId"     -> examId,
    "orgId"      -> ORG_REF,
    "roomId"     -> ROOM_REF,
    "sectionIds" -> Json.arr(1)
  )

  private def instantOf(timestamp: String): Long =
    ISODateTimeFormat.dateTimeParser().parseDateTime(timestamp).getMillis

  private def requestReservation(examId: Long) =
    val (_, session) = runIO(loginAsStudent())
    runIO(makeRequest(
      POST,
      "/app/iop/calendar/external/reservation",
      Some(reservationRequest(examId)),
      session = session
    ))

  "CollaborativeExternalCalendarController" when:
    "requesting an external reservation" should:
      "address the request to the chosen organisation and facility" in:
        val (ce, student) = setupCollaborativeExam()

        val result = requestReservation(ce.id)
        statusOf(result) must be(Status.CREATED)
        contentAsJsonOf(result).as[String] must be(RESERVATION_REF)

        // The organisation ref belongs in the /organisations/ segment and the room ref in
        // /facilities/ - swapping the two is silent until it reaches the proxy
        reservationServlet.lastUri must be(
          Some(s"/api/organisations/$ORG_REF/facilities/$ROOM_REF/reservations")
        )

        val sent = reservationServlet.lastBody match
          case Some(b) => b
          case None    => fail("Reservation request never reached the proxy")
        (sent \ "requestingOrg").as[String] must be("test-org")
        (sent \ "user").as[String] must be(student.eppn)
        // The proxy gets the instants, printed in whichever zone the request was parsed into
        instantOf((sent \ "start").as[String]) must be(fixedNow.plusHours(1).getMillis)
        instantOf((sent \ "end").as[String]) must be(fixedNow.plusHours(2).getMillis)
        (sent \ "optionalSections").as[JsArray].value.map(_.as[Long]) must be(Seq(1L))

      "store the reservation against the enrolment" in:
        val (ce, _) = setupCollaborativeExam()

        statusOf(requestReservation(ce.id)) must be(Status.CREATED)

        val created =
          DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).find match
            case Some(r) => r
            case None    => fail("Created reservation not found")

        val external = created.externalReservation
        external must not be null
        external.orgRef must be(ORG_REF)
        external.roomRef must be(ROOM_REF)
        external.orgName must be("Remote University")
        external.machineName must be("Machine 1")
        external.roomName must be("Room 1")
        external.mailAddress.city must be("Paris")

        val enrolment =
          DB.find(classOf[ExamEnrolment]).where().eq("collaborativeExam.id", ce.id).find match
            case Some(e) => e
            case None    => fail("Enrolment not found")
        enrolment.reservation.id must be(created.id)

      "refuse when the student has no enrolment for the exam" in:
        val (ce, _) = setupCollaborativeExam(withEnrolment = false)

        val result = requestReservation(ce.id)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_exam_not_found")
        reservationServlet.lastUri must be(None)

      "relay the reason reported by the proxy" in:
        val (ce, _) = setupCollaborativeExam()
        reservationServlet.responseStatus = Status.FORBIDDEN
        reservationServlet.errorMessage = "i18n_no_machines_available"

        val result = requestReservation(ce.id)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_no_machines_available")
        DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).find must be(None)
