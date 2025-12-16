// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import helpers.RemoteServerHelper.ServletDef
import helpers.{AttachmentServlet, RemoteServerHelper}
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import database.EbeanQueryExtensions
import models.admin.GeneralSettings
import models.assessment.{AutoEvaluationConfig, GradeEvaluation}
import models.enrolment.{ExamEnrolment, ExternalReservation, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.ExternalExam
import models.questions.Question
import models.sections.ExamSectionQuestionOption
import models.user.{Language, Role, User}
import org.apache.commons.io.IOUtils
import org.eclipse.jetty.server.Server
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, LocalDate}
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.Application
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.{JsArray, Json}
import play.api.test.Helpers._
import services.json.JsonDeserializer

import java.io.{File, FileInputStream, IOException}
import java.util
import scala.jdk.CollectionConverters._

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
      val soon = DateTime.now().plusHours(1)
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
      val soon = DateTime.now().plusHours(1)
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

  override def fakeApplication(): Application =
    val config = Map("exam.integration.enrolmentPermissionCheck.active" -> java.lang.Boolean.FALSE)
    new GuiceApplicationBuilder()
      .configure(config)
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
    exam.setPeriodStart(DateTime.now().minusDays(1))
    exam.setPeriodEnd(DateTime.now().plusDays(1))
    exam.update()

    val user = otherUser match
      case Some(u) =>
        u.setLanguage(DB.find(classOf[Language]).where().eq("code", "en").find.orNull)
        u.update()
        u
      case None => null // Some tests expect null user

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")
    room.setExternalRef(ROOM_REF)
    room.getExamMachines.get(0).setIpAddress("127.0.0.1")
    room.getExamMachines.get(0).update()
    room.update()

    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)
    enrolment.save()

    val gs = new GeneralSettings()
    gs.setName("reservation_window_size")
    gs.setValue("60")
    gs.setId(3L)
    gs.save()

    (exam, user, room, enrolment)

  private def setAutoEvaluationConfig(exam: Exam): Unit =
    val config = new AutoEvaluationConfig()
    config.setReleaseType(AutoEvaluationConfig.ReleaseType.IMMEDIATE)
    config.setGradeEvaluations(new util.HashSet())
    exam.getGradeScale.getGrades.asScala.foreach { g =>
      val ge = new GradeEvaluation()
      ge.setGrade(g)
      ge.setPercentage(20 * Integer.parseInt(g.getName))
      config.getGradeEvaluations.add(ge)
    }
    config.setExam(exam)
    config.save()

    /** Creates safe start and end times that avoid the midnight boundary issue. The lookup logic in
      * getUpcomingExternalReservation looks ahead until midnight, so we ensure reservations are scheduled before then
      * and always in the future.
      */
  private def createSafeTimes =
    val now       = DateTime.now
    var startTime = now.plusMinutes(30) // Start in 30 minutes
    var endTime   = now.plusMinutes(90) // End in 90 minutes

    // If this would cross midnight, move it to a safe time today
    val midnight = now.plusDays(1).withMillisOfDay(0)
    if startTime.isAfter(midnight) || endTime.isAfter(midnight) then
      // If we're close to midnight, schedule for a safe time earlier today
      // But ensure it's still in the future
      val safeStart = now.withHourOfDay(10).withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0)
      val safeEnd   = safeStart.plusHours(1)
      // If 10 AM is in the past, use the original future times but cap at 23:30
      if safeEnd.isBefore(now) then
        // Use original times but ensure they don't cross midnight
        startTime = now.plusMinutes(30)
        endTime = now.plusMinutes(90)
        // If still crossing midnight, cap at 23:30
        val latestStart = now.withHourOfDay(23).withMinuteOfHour(30).withSecondOfMinute(0).withMillisOfSecond(0)
        if startTime.isAfter(latestStart) then
          startTime = latestStart
          endTime = startTime.plusMinutes(30) // Short reservation to stay before midnight
        else startTime = safeStart
        endTime = safeEnd
    (startTime, endTime)

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
          s"/app/iop/calendar/${exam.getId}/${room.getExternalRef}?&org=$ORG_REF&date=${ISODateTimeFormat.date().print(LocalDate.now())}"
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

        // Setup a conflicting reservation
        val examList    = DB.find(classOf[Exam]).where().eq("state", Exam.State.PUBLISHED).list
        val exam2       = examList(1)
        val reservation = new Reservation()
        reservation.setUser(user)
        reservation.setStartAt(DateTime.now().plusMinutes(90))
        reservation.setEndAt(DateTime.now().plusHours(2))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()
        val enrolment2 = new ExamEnrolment()
        enrolment2.setExam(exam2)
        enrolment2.setUser(user)
        enrolment2.setReservation(reservation)
        enrolment2.save()

        val (_, session) = runIO(loginAsStudent())
        val url =
          s"/app/iop/calendar/${exam.getId}/${room.getExternalRef}?&org=$ORG_REF&date=${ISODateTimeFormat.date().print(LocalDate.now())}"
        val result = runIO(get(url, session = session))
        statusOf(result) must be(Status.OK)
        val node = contentAsJsonOf(result)
        node.as[JsArray].value must have size 2
        val an = node.as[JsArray]

        // Ensure that first slot got marked as reserved (due conflicting reservation)
        (an.value(0) \ "availableMachines").as[Int] must be(-1)
        (an.value(0) \ "conflictingExam").as[String] must be(exam2.getName)
        (an.value(1) \ "availableMachines").as[Int] must be(7)

    "providing slots" should:
      "return available slots for room" in:
        val (_, _, room, _) = setupTestData()
        val machineCount    = room.getExamMachines.asScala.count(!_.getOutOfService)
        val url =
          s"/integration/iop/slots?roomId=${room.getExternalRef}&date=${ISODateTimeFormat.date().print(LocalDate.now())}&start=${ISODateTimeFormat
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

    "providing reservations" should:
      "create reservation successfully" in:
        val (_, _, room, _) = setupTestData()

        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2)

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
          Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()) match
            case Some(r) => r
            case None    => fail("Reservation not found")

        reservation must not be null
        reservation.getMachine.getRoom.getExternalRef must be(ROOM_REF)
        reservation.getStartAt must be(start)
        reservation.getEndAt must be(end)

    "acknowledging reservation removal" should:
      "remove reservation successfully" in:
        val (_, _, room, _) = setupTestData()
        val reservation     = new Reservation()
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF"))
        statusOf(result) must be(Status.OK)

        val removed = DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).find
        removed must be(empty)

    "acknowledging reservation revocation" should:
      "revoke reservation successfully" in:
        val (_, user, room, enrolment) = setupTestData()
        val reservation                = new Reservation()
        reservation.setUser(user)
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setExternalRef(RESERVATION_REF)
        val er = new ExternalReservation()
        er.setOrgRef(ORG_REF)
        er.setRoomRef(ROOM_REF)
        er.setMachineName("M1")
        er.setRoomName("External Room R1")
        er.save()
        reservation.setExternalReservation(er)
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF/force"))
        statusOf(result) must be(Status.OK)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.getReservation must be(null)
        Option(DB.find(classOf[Reservation], reservation.getId)) must be(empty)

      "fail to revoke reservation in effect" in:
        val (_, user, room, enrolment) = setupTestData()

        val reservation = new Reservation()
        reservation.setUser(user)
        reservation.setStartAt(DateTime.now().minusHours(1))
        reservation.setEndAt(DateTime.now().plusHours(2))
        reservation.setExternalRef(RESERVATION_REF)
        val er = new ExternalReservation()
        er.setOrgRef(ORG_REF)
        er.setRoomRef(ROOM_REF)
        er.setMachineName("M1")
        er.setRoomName("External Room R1")
        er.save()
        reservation.setExternalReservation(er)
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(delete(s"/integration/iop/reservations/$RESERVATION_REF/force"))
        statusOf(result) must be(Status.FORBIDDEN)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.getReservation must not be null

    "requesting reservation revocation as admin" should:
      "revoke external reservation successfully" in:
        val (_, _, room, _) = setupTestData()

        val reservation = new Reservation()
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setExternalUserRef("testuser@test.org")
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setMachine(room.getExamMachines.get(0))
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
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(DateTime.now().minusHours(1))
        reservation.setEndAt(DateTime.now().plusHours(2))
        reservation.setMachine(room.getExamMachines.get(0))
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

        val removed = Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne())
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
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()

        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(get(s"/integration/iop/reservations/$RESERVATION_REF"))
        statusOf(result) must be(Status.OK)

        val body        = contentAsJsonOf(result)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(body.toString)
        val ee          = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
        ee.getId must be(exam.getId)
        ee.getExamSections must have size exam.getExamSections.size()
        ee.getExamSections.asScala.map(_.getSectionQuestions.size()).sum must be(
          exam.getExamSections.asScala.map(_.getSectionQuestions.size()).sum
        )

    "handling temporal student visitor login" should:
      "create user and enrolment successfully" in:
        val (exam, _, room, _) = setupTestData()
        val eppn               = "newuser@test.org"
        // Create a reservation within the same day to avoid midnight boundary issues
        val (start, end) = createSafeTimes

        val reservation = new Reservation()
        reservation.setExternalUserRef(eppn)
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(start)
        reservation.setEndAt(end)
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()

        val (user, session) = runIO(login(eppn))
        val newUser = DB.find(classOf[User]).where().eq("eppn", eppn).find match
          case Some(u) => u
          case None    => fail("New user not found")

        newUser must not be null
        newUser.getRoles must have size 1
        newUser.getRoles.get(0).getName must be(Role.Name.TEACHER.toString)

        val updatedReservation =
          Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()) match
            case Some(r) => r
            case None    => fail("Reservation not found")
        updatedReservation.getUser.getId must be(newUser.getId)

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
        enrolment.getExam must be(null)
        enrolment.getExternalExam must not be null

        val mapper     = new ObjectMapper()
        val json       = mapper.writeValueAsString(enrolment.getExternalExam.getContent)
        val node       = mapper.readTree(json)
        val parsedExam = JsonDeserializer.deserialize(classOf[Exam], node)
        parsedExam.getId must be(13630L) // ID that is in enrolment.json

      "handle wrong machine IP" in:
        val (_, _, room, _) = setupTestData()
        val eppn            = "newuser@other.org"
        // Create a reservation within the same day to avoid midnight boundary issues
        val (start, end) = createSafeTimes

        val machine = room.getExamMachines.get(0)
        machine.setIpAddress("128.2.2.2")
        machine.update()
        val reservation = new Reservation()
        reservation.setExternalUserRef(eppn)
        reservation.setExternalRef(RESERVATION_REF)
        reservation.setStartAt(start)
        reservation.setEndAt(end)
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()

        val (user, session) = runIO(login(eppn))
        // See that user is informed of wrong ip
        val result = runIO(get("/app/session", session = session))
        result.header.headers.get("x-exam-unknown-machine") must be(defined)

    "requesting external reservations as student" should:
      "create reservation with email notification" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, _, _, _) = setupTestData(Some(studentUser))

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"         -> ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(1)),
          "end"           -> ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(2)),
          "examId"        -> exam.getId.longValue,
          "orgId"         -> ORG_REF,
          "roomId"        -> ROOM_REF,
          "requestingOrg" -> "foobar",
          "sectionIds"    -> Json.arr(1)
        )

        val result = runIO(makeRequest(POST, "/app/iop/reservations/external", Some(requestData), session = session))
        statusOf(result) must be(Status.CREATED)

        val body = contentAsJsonOf(result)
        body.as[String] must be(RESERVATION_REF)

        val created = Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()) match
          case Some(r) => r
          case None    => fail("Created reservation not found")

        created must not be null
        created.getEnrolment.getOptionalSections must have size 1
        val external = created.getExternalReservation
        external must not be null
        external.getRoomInstructionEN must be("information in English here")
        external.getMailAddress.getCity must be("Paris")

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
          "start"         -> ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(1)),
          "end"           -> ISODateTimeFormat.dateTime().print(DateTime.now().plusHours(2)),
          "examId"        -> exam.getId.longValue,
          "orgId"         -> ORG_REF,
          "roomId"        -> ROOM_REF,
          "requestingOrg" -> "foobar",
          "sectionIds"    -> Json.arr(1)
        )

        val result = runIO(makeRequest(POST, "/app/iop/reservations/external", Some(requestData), session = session))
        val body   = contentAsJsonOf(result)
        body.as[String] must be(RESERVATION_REF)

        val created = Option(DB.find(classOf[Reservation]).where().eq("externalRef", RESERVATION_REF).findOne()) match
          case Some(r) => r
          case None    => fail("Created reservation not found")
        created.setStartAt(DateTime.now().minusHours(2))
        created.setEndAt(DateTime.now().minusHours(1))
        created.save()

        val enrolmentData = Json.obj("code" -> exam.getCourse.getCode)
        val result2 = runIO(makeRequest(POST, s"/app/enrolments/${exam.getId}", Some(enrolmentData), session = session))
        statusOf(result2) must be(Status.FORBIDDEN)

      "handle previous reservation in effect" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))

        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2)

        val reservation = new Reservation()
        reservation.setStartAt(DateTime.now().minusMinutes(10))
        reservation.setEndAt(DateTime.now().plusMinutes(10))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end),
          "examId" -> exam.getId.longValue(),
          "orgId"  -> ORG_REF,
          "roomId" -> ROOM_REF
        )
        val result = runIO(makeRequest(POST, "/app/iop/reservations/external", Some(requestData), session = session))

        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_enrolment_not_found")

        // Verify
        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.getReservation.getId must be(reservation.getId)

      "replace previous reservation in the future" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (exam, user, room, enrolment) = setupTestData(Some(studentUser))

        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(6)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(7)

        val reservation = new Reservation()
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setExternalRef(RESERVATION_REF)
        val er = new ExternalReservation()
        er.setOrgRef(ORG_REF)
        er.setRoomRef(ROOM_REF)
        er.setMachineName("M1")
        er.setRoomName("External Room R1")
        er.save()
        reservation.setExternalReservation(er)
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val requestData = Json.obj(
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end),
          "examId" -> exam.getId.longValue(),
          "orgId"  -> ORG_REF,
          "roomId" -> ROOM_REF
        )
        val result = runIO(makeRequest(POST, "/app/iop/reservations/external", Some(requestData), session = session))

        statusOf(result) must be(Status.CREATED)

        // Verify
        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.getReservation.getId must not be reservation.getId
        Option(DB.find(classOf[Reservation], reservation.getId)) must be(empty)

        greenMail.waitForIncomingEmail(5000, 1)

    "requesting reservation removal as student" should:
      "remove reservation with email notification" in:
        ensureTestDataLoaded()
        val studentUser = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
          case Some(u) => u
          case None    => fail("Student user not found")
        val (_, user, _, enrolment) = setupTestData(Some(studentUser))

        val reservation = new Reservation()
        reservation.setUser(user)
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setExternalRef(RESERVATION_REF)
        val er = new ExternalReservation()
        er.setOrgRef(ORG_REF)
        er.setRoomRef(ROOM_REF)
        er.setMachineName("M1")
        er.setRoomName("External Room R1")
        er.save()
        reservation.setExternalReservation(er)
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val (_, session) = runIO(loginAsStudent())
        val result       = runIO(delete(s"/app/iop/reservations/external/$RESERVATION_REF", session = session))
        statusOf(result) must be(Status.OK)

        val ee = Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(e) => e
          case None    => fail("Enrolment not found")
        ee.getReservation must be(null)
        Option(DB.find(classOf[Reservation], reservation.getId)) must be(empty)

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
        reservation.setExternalUserRef(eppn)
        reservation.setExternalRef(RESERVATION_REF)
        // Use shorter offset to avoid crossing midnight boundary
        reservation.setStartAt(start)
        reservation.setEndAt(end)
        reservation.setMachine(room.getExamMachines.get(0))
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

        Option(DB.find(classOf[Reservation], reservation.getId)) must be(empty)
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) must be(empty)
        Option(DB.find(classOf[ExternalExam], enrolment.getExternalExam.getId)) must be(empty)
