// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper.ServletDef
import helpers.{AttachmentServlet, RemoteServerHelper}
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.admin.GeneralSettings
import models.assessment.{AutoEvaluationConfig, AutoEvaluationReleaseType, GradeEvaluation}
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.{Exam, ExamState}
import models.facility.ExamRoom
import models.iop.ExternalExam
import models.questions.QuestionType
import models.sections.ExamSectionQuestionOption
import models.user.{Language, Role, User}
import org.apache.commons.io.IOUtils
import org.eclipse.jetty.server.Server
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone, LocalDate}
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.Application
import play.api.http.Status
import play.api.inject.bind
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.{JsArray, Json}
import play.api.test.Helpers.*
import services.datetime.{AppClock, FixedAppClock}
import services.json.JsonDeserializer

import java.io.{File, FileInputStream, IOException}
import java.util
import scala.jdk.CollectionConverters.*

class ExternalCalendarInterfaceSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with Matchers
    with EbeanQueryExtensions:

  private val ORG_REF         = "thisissomeorgref"
  private val ROOM_REF        = "0e6d16c51f857a20ab578f57f1018456"
  private val RESERVATION_REF = "0e6d16c51f857a20ab578f57f105032e"
  private val MAIL_TIMEOUT    = 5000L

  // Server infrastructure
  private var server: Option[Server] = None

  // GreenMail setup for email testing
  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  class SlotServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      val soon = fixedNow.plusHours(1)
      val slot1 = Json.obj(
        "start"             -> ISODateTimeFormat.dateTime().print(soon),
        "end"               -> ISODateTimeFormat.dateTime().print(soon.plusHours(1)),
        "availableMachines" -> 4
      )
      val slot2 = Json.obj(
        "start"             -> ISODateTimeFormat.dateTime().print(soon.plusHours(2)),
        "end"               -> ISODateTimeFormat.dateTime().print(soon.plusHours(3)),
        "availableMachines" -> 7
      )
      val arrayNode = Json.arr(slot1, slot2)
      RemoteServerHelper.writeJsonResponse(response, arrayNode, HttpServletResponse.SC_OK)

  class ReservationServlet extends HttpServlet:
    override def doPost(request: HttpServletRequest, response: HttpServletResponse): Unit =
      val soon = fixedNow.plusHours(1)
      val addressNode = Json.obj(
        "city"   -> "Paris",
        "street" -> "123 Rue Monet",
        "zip"    -> "1684"
      )
      val room = Json.obj(
        "name"              -> "Room 1",
        "roomCode"          -> "R1",
        "localTimezone"     -> "Europe/Helsinki",
        "roomInstructionEN" -> "information in English here",
        "buildingName"      -> "B1",
        "mailAddress"       -> addressNode
      )
      val machine = Json.obj(
        "name" -> "Machine 1",
        "room" -> room
      )
      val reservation = Json.obj(
        "start"           -> ISODateTimeFormat.dateTime().print(soon),
        "end"             -> ISODateTimeFormat.dateTime().print(soon.plusHours(1)),
        "id"              -> RESERVATION_REF,
        "externalUserRef" -> "user1@uni.org",
        "machine"         -> machine
      )

      RemoteServerHelper.writeJsonResponse(response, reservation, HttpServletResponse.SC_CREATED)

  class ReservationRemovalServlet extends HttpServlet:
    override def doDelete(request: HttpServletRequest, response: HttpServletResponse): Unit =
      RemoteServerHelper.writeEmptyJsonResponse(response)

  class EnrolmentServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      response.setContentType("application/json")
      response.setStatus(HttpServletResponse.SC_OK)

      val file = new File("test/resources/enrolment.json")
      try
        val fis = new FileInputStream(file)
        val sos = response.getOutputStream
        IOUtils.copy(fis, sos)
        sos.flush()
        fis.close()
      catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

  // Anchored to today at 10:00 — consistent with LocalDate.now() in URLs and DateTime.now() in test
  // setup, while keeping the time-of-day safely within working hours and well before midnight
  val fixedNow: DateTime = DateTime.now().withTimeAtStartOfDay().plusHours(10)

  override def fakeApplication(): Application =
    val config = Map("exam.integration.enrolmentPermissionCheck.active" -> java.lang.Boolean.FALSE)
    new GuiceApplicationBuilder()
      .configure(config)
      .overrides(bind[AppClock].toInstance(FixedAppClock(fixedNow)))
      .build()

  override def beforeAll(): Unit =
    super.beforeAll()
    startGreenMail()

    val baseUrl  = s"/api/organisations/$ORG_REF/facilities/$ROOM_REF"
    val baseUrl2 = s"/api/organisations/test-org/facilities/$ROOM_REF"
    val bindings = Seq(
      ServletDef.FromInstance(new SlotServlet())        -> List(s"$baseUrl/slots"),
      ServletDef.FromInstance(new ReservationServlet()) -> List(s"$baseUrl/reservations"),
      ServletDef.FromInstance(new ReservationRemovalServlet()) -> List(
        s"$baseUrl/reservations/$RESERVATION_REF",
        s"$baseUrl2/reservations/$RESERVATION_REF/force"
      ),
      ServletDef.FromInstance(new EnrolmentServlet())  -> List(s"/api/enrolments/$RESERVATION_REF"),
      ServletDef.FromInstance(new AttachmentServlet()) -> List("/api/attachments/*")
    )
    server = Some(RemoteServerHelper.createServer(31247, false, bindings*))

  override def afterAll(): Unit =
    try
      stopGreenMail()
      server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    greenMail.purgeEmailFromAllMailboxes()

  private def initExamSectionQuestions(exam: Exam): Unit =
    exam.examSections = new java.util.TreeSet(exam.examSections)
    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter { esq =>
        esq.question.`type` == QuestionType.MultipleChoiceQuestion ||
        esq.question.`type` == QuestionType.WeightedMultipleChoiceQuestion
      }
      .foreach { esq =>
        esq.question.options.asScala.foreach { o =>
          val esqo = new ExamSectionQuestionOption()
          esqo.option = o
          esqo.score = o.defaultScore
          esq.options.add(esqo)
        }
        esq.save()
      }

  private def setupTestData(otherUser: Option[User] = None): (Exam, User, ExamRoom, ExamEnrolment) =
    ensureTestDataLoaded()

    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

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
    exam.periodStart = DateTime.now().minusDays(1)
    exam.periodEnd = DateTime.now().plusDays(1)
    exam.update()

    val user = otherUser match
      case Some(u) =>
        u.language = DB.find(classOf[Language]).where().eq("code", "en").find.orNull
        u.update()
        u
      case None => null // Some tests expect null user

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")
    room.externalRef = ROOM_REF
    room.examMachines.asScala.head.ipAddress = "127.0.0.1"
    room.examMachines.asScala.head.update()
    room.update()

    val enrolment = new ExamEnrolment()
    enrolment.exam = exam
    enrolment.user = user
    enrolment.save()

    val gs = new GeneralSettings()
    gs.name = "reservation_window_size"
    gs.value = "60"
    gs.id = 3L
    gs.save()

    (exam, user, room, enrolment)

  private def setAutoEvaluationConfig(exam: Exam): Unit =
    val config = new AutoEvaluationConfig()
    config.releaseType = AutoEvaluationReleaseType.IMMEDIATE
    config.gradeEvaluations = new util.HashSet()
    exam.gradeScale.grades.asScala.foreach { g =>
      val ge = new GradeEvaluation()
      ge.grade = g
      ge.percentage = 20 * Integer.parseInt(g.name)
      config.gradeEvaluations.add(ge)
    }
    config.exam = exam
    config.save()

  private def createSafeTimes = (fixedNow.plusHours(1), fixedNow.plusHours(2))

  "ExternalCalendarInterface" when:
    "getting slots" should:
      "return available slots" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))
        val (_, session)                  = runIO(loginAsStudent())
        val url =
          s"/app/iop/calendar/${exam.id}/${room.externalRef}?&org=$ORG_REF&date=${ISODateTimeFormat.date().print(LocalDate.now())}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        val node = contentAsJsonOf(result)
        node.as[JsArray].value must have size 2
        val an = node.as[JsArray]
        (an.value(0) \ "availableMachines").as[Int] must be(4)
        (an.value(1) \ "availableMachines").as[Int] must be(7)

      "handle conflicting reservations" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))

        // Setup a conflicting reservation overlapping with the first slot (fixedNow+1h to fixedNow+2h)
        val examList    = DB.find(classOf[Exam]).where().eq("state", ExamState.PUBLISHED).list
        val exam2       = examList(1)
        val reservation = new Reservation()
        reservation.user = user
        reservation.startAt = fixedNow.plusMinutes(90)
        reservation.endAt = fixedNow.plusHours(2)
        reservation.machine = room.examMachines.get(0)
        reservation.save()
        val enrolment2 = new ExamEnrolment()
        enrolment2.exam = exam2
        enrolment2.user = user
        enrolment2.reservation = reservation
        enrolment2.save()

        val (_, session) = runIO(loginAsStudent())
        val url =
          s"/app/iop/calendar/${exam.id}/${room.externalRef}?&org=$ORG_REF&date=${ISODateTimeFormat.date().print(LocalDate.now())}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        val node = contentAsJsonOf(result)
        node.as[JsArray].value must have size 2
        val an = node.as[JsArray]

        // Ensure that first slot got marked as reserved (due conflicting reservation)
        (an.value(0) \ "availableMachines").as[Int] must be(-1)
        (an.value(0) \ "conflictingExam").as[String] must be(exam2.name)
        (an.value(1) \ "availableMachines").as[Int] must be(7)

    "providing slots" should:
      "return available slots for room" in:
        val (_, _, room, _) = setupTestData()
        val machineCount    = room.examMachines.asScala.count(!_.outOfService)
        val url =
          s"/integration/iop/slots?roomId=${room.externalRef}&date=${ISODateTimeFormat.date().print(LocalDate.now())}&start=${ISODateTimeFormat
              .dateTime()
              .print(DateTime.now().minusDays(7))}&end=${ISODateTimeFormat.dateTime().print(DateTime.now().plusDays(7))}&duration=180"
        val slotsResult = runIO(get(url))
        statusOf(slotsResult).must(be(Status.OK))
        val node = contentAsJsonOf(slotsResult)
        val an   = node.as[JsArray]
        // This could be empty if we ran this on a Sunday after 13 PM :)
        an.value.foreach { slot =>
          (slot \ "availableMachines").as[Int] must be(machineCount)
          (slot \ "ownReservation").as[Boolean] must be(false)
          (slot \ "conflictingExam").asOpt[String] must be(None)
        }

      "exclude day before exam start after DST change" in:
        val (_, _, room, _) = setupTestData()
        room.localTimezone = "Europe/Helsinki"
        room.update()
        // reservation_window_size=60 already set by setupTestData()

        // Exam period: April 2–5 in room's timezone. Use UTC instants so the URL has no '+' (e.g. +03:00).
        // April 2 00:00 Helsinki (EEST) = 2026-04-01T21:00:00Z, April 5 23:59 Helsinki = 2026-04-05T20:59:59Z.
        val examStartUtc = new DateTime(2026, 4, 1, 21, 0, 0, DateTimeZone.UTC)
        val examEndUtc   = new DateTime(2026, 4, 5, 20, 59, 59, DateTimeZone.UTC)

        // Request slots for the week containing April 1 (date=2026-03-31).
        // Without the DST fix, search could start on April 1 and return slots for that day.
        val url =
          s"/integration/iop/slots?roomId=${room.externalRef}&date=2026-03-31&start=${ISODateTimeFormat.dateTime().print(
              examStartUtc
            )}&end=${ISODateTimeFormat.dateTime().print(examEndUtc)}&duration=180"
        val result = runIO(get(url))
        statusOf(result) must be(Status.OK)
        val node          = contentAsJsonOf(result)
        val slots         = node.as[JsArray]
        val examStartDate = new LocalDate(2026, 4, 2)
        slots.value.foreach { slot =>
          val startIso = (slot \ "start").as[String]
          val slotDate = ISODateTimeFormat.dateTimeParser().parseDateTime(startIso).toLocalDate
          slotDate.isBefore(examStartDate) must be(false)
        }

    "providing reservations" should:
      "create reservation successfully" in:
        val (_, _, room, _) = setupTestData()

        val start = fixedNow.plusHours(1)
        val end   = fixedNow.plusHours(2)

        val requestData = Json.obj(
          "id"      -> RESERVATION_REF,
          "roomId"  -> ROOM_REF,
          "start"   -> ISODateTimeFormat.dateTime().print(start),
          "end"     -> ISODateTimeFormat.dateTime().print(end),
          "user"    -> "studentone@uni.org",
          "orgRef"  -> "1234",
          "orgName" -> "1234"
        )

        val result = runIO(makeRequest(POST, "/integration/iop/reservations", Some(requestData)))
        statusOf(result) must be(Status.CREATED)

        val reservation =
          Option(
            DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()
          ) match
            case Some(r) => r
            case None    => fail("Reservation not found")

        reservation must not be null
        reservation.machine.room.externalRef must be(ROOM_REF)
        reservation.startAt.getMillis must be(start.getMillis)
        reservation.endAt.getMillis must be(end.getMillis)

    "acknowledging reservation removal" should:
      "remove reservation successfully" in:
        val (_, _, room, _) = setupTestData()
        val reservation     = new Reservation()
        reservation.externalRef = RESERVATION_REF
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF"))
        statusOf(result) must be(Status.OK)

        val removed = DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).find
        removed must be(empty)

    "acknowledging reservation revocation" should:
      "revoke reservation successfully" in:
        val (_, user, room, enrolment) = setupTestData()
        val reservation                = new Reservation()
        reservation.user = user
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.externalRef = RESERVATION_REF
        val er = new ExternalReservation()
        er.orgRef = ORG_REF
        er.roomRef = ROOM_REF
        er.machineName = "M1"
        er.roomName = "External Room R1"
        er.save()
        reservation.externalReservation = er
        reservation.save()
        enrolment.reservation = reservation
        enrolment.update()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF/force"))
        statusOf(result) must be(Status.OK)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.id)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.reservation must be(null)
        Option(DB.find(classOf[Reservation], reservation.id)) must be(empty)

      "fail to revoke reservation in effect" in:
        val (_, user, room, enrolment) = setupTestData()

        val reservation = new Reservation()
        reservation.user = user
        reservation.startAt = fixedNow.minusHours(1)
        reservation.endAt = fixedNow.plusHours(2)
        reservation.externalRef = RESERVATION_REF
        val er = new ExternalReservation()
        er.orgRef = ORG_REF
        er.roomRef = ROOM_REF
        er.machineName = "M1"
        er.roomName = "External Room R1"
        er.save()
        reservation.externalReservation = er
        reservation.save()
        enrolment.reservation = reservation
        enrolment.update()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF/force"))
        statusOf(result) must be(Status.FORBIDDEN)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.id)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.reservation must not be null

    "requesting reservation revocation as admin" should:
      "revoke external reservation successfully" in:
        val (_, _, room, _) = setupTestData()

        val reservation = new Reservation()
        reservation.externalRef = RESERVATION_REF
        reservation.externalUserRef = "testuser@test.org"
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        val (_, session) = runIO(loginAsAdmin())
        val requestData  = Json.obj("msg" -> "msg")
        val result = runIO(
          makeRequest(
            DELETE,
            s"/app/iop/reservations/external/$RESERVATION_REF/force",
            Some(requestData),
            session = session
          )
        )
        statusOf(result) must be(Status.OK)

        val removed = DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).find
        removed must be(empty)

      "fail to delete reservation in progress" in:
        val (_, _, room, _) = setupTestData()

        val reservation = new Reservation()
        reservation.externalRef = RESERVATION_REF
        reservation.startAt = fixedNow.minusHours(1)
        reservation.endAt = fixedNow.plusHours(2)
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        val (_, session) = runIO(loginAsAdmin())
        val requestData  = Json.obj("msg" -> "msg")
        val result = runIO(
          makeRequest(
            DELETE,
            s"/app/iop/reservations/external/$RESERVATION_REF/force",
            Some(requestData),
            session = session
          )
        )
        statusOf(result) must be(Status.FORBIDDEN)

        val removed =
          Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne())
        removed must be(defined)

    "providing enrolment" should:
      "return enrolment data successfully" in:
        ensureTestDataLoaded()
        val user1 = DB.find(classOf[User]).where().eq("email", "admin@funet.fi").find match
          case Some(u) => u
          case None    => fail("Admin user not found")
        val (exam, _, room, enrolment) = setupTestData(Some(user1))
        setAutoEvaluationConfig(exam)

        val reservation = new Reservation()
        reservation.externalRef = RESERVATION_REF
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        enrolment.reservation = reservation
        enrolment.update()

        val result = runIO(get(s"/integration/iop/reservations/$RESERVATION_REF"))
        statusOf(result) must be(Status.OK)

        val body        = contentAsJsonOf(result)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(body.toString)
        val ee          = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
        ee.id must be(exam.id)
        ee.examSections must have size exam.examSections.size()
        ee.examSections.asScala.map(_.sectionQuestions.size()).sum must be(
          exam.examSections.asScala.map(_.sectionQuestions.size()).sum
        )

    "handling temporal student visitor login" should:
      "create user and enrolment successfully" in:
        val (exam, _, room, _) = setupTestData()
        val eppn               = "newuser@test.org"
        // Create a reservation within the same day to avoid midnight boundary issues
        val (start, end) = createSafeTimes

        val reservation = new Reservation()
        reservation.externalUserRef = eppn
        reservation.externalRef = RESERVATION_REF
        reservation.startAt = start
        reservation.endAt = end
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        val (user, session) = runIO(login(eppn))
        val newUser = DB.find(classOf[User]).where().eq("eppn", eppn).find match
          case Some(u) => u
          case None    => fail("New user not found")

        newUser must not be null
        newUser.roles must have size 1
        newUser.roles.get(0).name must be(Role.Name.TEACHER.toString)

        val updatedReservation =
          Option(
            DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()
          ) match
            case Some(r) => r
            case None    => fail("Reservation not found")
        updatedReservation.user.id must be(newUser.id)

        // See that user is eventually directed to waiting room
        val sessionResult = runIO(get("/app/session", session = session))
        sessionResult.header.headers.get("x-exam-upcoming-exam") must be(defined)

        // Try do some teacher stuff, see that it is not allowed
        val result = runIO(get("/app/reviewerexams", session = session))
        statusOf(result) must be(Status.FORBIDDEN)

        // see that enrolment was created for the user
        val enrolment =
          DB.find(classOf[ExamEnrolment])
            .where()
            .eq("reservation.externalRef", RESERVATION_REF)
            .find match
            case Some(e) => e
            case None    => fail("Enrolment not found")

        enrolment must not be null
        enrolment.exam must be(null)
        enrolment.externalExam must not be null

        val mapper     = new ObjectMapper()
        val json       = mapper.writeValueAsString(enrolment.externalExam.content)
        val node       = mapper.readTree(json)
        val parsedExam = JsonDeserializer.deserialize(classOf[Exam], node)
        parsedExam.id must be(13630L) // ID that is in enrolment.json

      "handle wrong machine IP" in:
        val (_, _, room, _) = setupTestData()
        val eppn            = "newuser@other.org"
        // Create a reservation within the same day to avoid midnight boundary issues
        val (start, end) = createSafeTimes

        val machine = room.examMachines.asScala.head
        machine.ipAddress = "128.2.2.2"
        machine.update()
        val reservation = new Reservation()
        reservation.externalUserRef = eppn
        reservation.externalRef = RESERVATION_REF
        reservation.startAt = start
        reservation.endAt = end
        reservation.machine = room.examMachines.asScala.head
        reservation.save()

        // Login is rejected when temp visitor is on unknown machine and home org required
        runIO(loginExpectFailure(eppn))

    "requesting external reservations as student" should:
      "create reservation with email notification" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, _, _, _) = setupTestData(Some(studentUser))

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"         -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(1)),
          "end"           -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(2)),
          "examId"        -> exam.id.longValue,
          "orgId"         -> ORG_REF,
          "roomId"        -> ROOM_REF,
          "requestingOrg" -> "foobar",
          "sectionIds"    -> Json.arr(1)
        )

        val result = runIO(makeRequest(
          POST,
          "/app/iop/reservations/external",
          Some(requestData),
          session = session
        ))
        statusOf(result) must be(Status.CREATED)

        val body = contentAsJsonOf(result)
        body.as[String] must be(RESERVATION_REF)

        val created = Option(DB.find(classOf[Reservation]).where().eq(
          "externalRef",
          RESERVATION_REF
        ).findOne()) match
          case Some(r) => r
          case None    => fail("Created reservation not found")

        created must not be null
        created.enrolment.optionalSections must have size 1
        val external = created.externalReservation
        external must not be null
        external.roomInstructionEN must be("information in English here")
        external.mailAddress.city must be("Paris")

        // Check that correct mail was sent
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1
        mails(0).getFrom()(0).toString must include("no-reply@exam.org")
        val mailBody = GreenMailUtil.getBody(mails(0))
        mailBody must include("You have booked an exam time")
        mailBody must include("Room 1")

      "prevent re-enrollment before assessment returned" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, _, _, _) = setupTestData(Some(studentUser))
        val (_, session)    = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"         -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(1)),
          "end"           -> ISODateTimeFormat.dateTime().print(fixedNow.plusHours(2)),
          "examId"        -> exam.id.longValue,
          "orgId"         -> ORG_REF,
          "roomId"        -> ROOM_REF,
          "requestingOrg" -> "foobar",
          "sectionIds"    -> Json.arr(1)
        )

        val result = runIO(makeRequest(
          POST,
          "/app/iop/reservations/external",
          Some(requestData),
          session = session
        ))
        val body = contentAsJsonOf(result)
        body.as[String] must be(RESERVATION_REF)

        val created = Option(DB.find(classOf[Reservation]).where().eq(
          "externalRef",
          RESERVATION_REF
        ).findOne()) match
          case Some(r) => r
          case None    => fail("Created reservation not found")
        created.startAt = fixedNow.minusHours(2)
        created.endAt = fixedNow.minusHours(1)
        created.save()

        val enrolmentData = Json.obj("code" -> exam.course.code)
        val result2 = runIO(makeRequest(
          POST,
          s"/app/enrolments/${exam.id}",
          Some(enrolmentData),
          session = session
        ))
        statusOf(result2) must be(Status.FORBIDDEN)

      "handle previous reservation in effect" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))

        val start = fixedNow.plusHours(1)
        val end   = fixedNow.plusHours(2)

        val reservation = new Reservation()
        reservation.startAt = fixedNow.minusMinutes(10)
        reservation.endAt = fixedNow.plusMinutes(10)
        reservation.machine = room.examMachines.getFirst
        reservation.save()
        enrolment.reservation = reservation
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end),
          "examId" -> exam.id.longValue(),
          "orgId"  -> ORG_REF,
          "roomId" -> ROOM_REF
        )
        val result = runIO(makeRequest(
          POST,
          "/app/iop/reservations/external",
          Some(requestData),
          session = session
        ))

        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_enrolment_not_found")

        // Verify
        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.id)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.reservation.id must be(reservation.id)

      "replace previous reservation in the future" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))

        val start = fixedNow.plusHours(6)
        val end   = fixedNow.plusHours(7)

        val reservation = new Reservation()
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.externalRef = RESERVATION_REF
        val er = new ExternalReservation()
        er.orgRef = ORG_REF
        er.roomRef = ROOM_REF
        er.machineName = "M1"
        er.roomName = "External Room R1"
        er.save()
        reservation.externalReservation = er
        reservation.save()
        enrolment.reservation = reservation
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end),
          "examId" -> exam.id.longValue(),
          "orgId"  -> ORG_REF,
          "roomId" -> ROOM_REF
        )
        val result = runIO(makeRequest(
          POST,
          "/app/iop/reservations/external",
          Some(requestData),
          session = session
        ))

        statusOf(result) must be(Status.CREATED)

        // Verify
        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.id)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.reservation.id must not be reservation.id
        Option(DB.find(classOf[Reservation], reservation.id)) must be(empty)

        greenMail.waitForIncomingEmail(5000, 1)

    "requesting reservation removal as student" should:
      "remove reservation with email notification" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (_, user, _, enrolment) = setupTestData(Some(studentUser))

        val reservation = new Reservation()
        reservation.user = user
        reservation.startAt = fixedNow.plusHours(2)
        reservation.endAt = fixedNow.plusHours(3)
        reservation.externalRef = RESERVATION_REF
        val er = new ExternalReservation()
        er.orgRef = ORG_REF
        er.roomRef = ROOM_REF
        er.machineName = "M1"
        er.roomName = "External Room R1"
        er.save()
        reservation.externalReservation = er
        reservation.save()
        enrolment.reservation = reservation
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val result =
          runIO(delete(s"/app/iop/reservations/external/$RESERVATION_REF", session = session))
        statusOf(result) must be(Status.OK)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.id)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.reservation must be(null)
        Option(DB.find(classOf[Reservation], reservation.id)) must be(empty)

        // Check that correct mail was sent
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1
        mails(0).getFrom()(0).toString must include("no-reply@exam.org")
        val mailBody = GreenMailUtil.getBody(mails(0))
        mailBody must include("External Room R1")

    "handling reservation removal after remote login" should:
      "clean up user and enrolment data" in:
        val (_, _, room, _) = setupTestData()
        val eppn            = "newuser@test.org"
        // Create a reservation within the same day to avoid midnight boundary issues
        val (start, end) = createSafeTimes

        val reservation = new Reservation()
        reservation.externalUserRef = eppn
        reservation.externalRef = RESERVATION_REF
        // Use shorter offset to avoid crossing midnight boundary
        reservation.startAt = start
        reservation.endAt = end
        reservation.machine = room.examMachines.get(0)
        reservation.save()

        val (user, session) = runIO(login(eppn))
        val enrolment =
          DB.find(classOf[ExamEnrolment])
            .where()
            .eq("reservation.externalRef", RESERVATION_REF)
            .find match
            case Some(e) => e
            case None    => fail("Enrolment not found")

        runIO(logout())
        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF"))
        statusOf(result) must be(Status.OK)

        Option(DB.find(classOf[Reservation], reservation.id)) must be(empty)
        Option(DB.find(classOf[ExamEnrolment], enrolment.id)) must be(empty)
        Option(DB.find(classOf[ExternalExam], enrolment.externalExam.id)) must be(empty)
