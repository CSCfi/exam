// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import io.ebean.DB
import database.EbeanQueryExtensions
import models.calendar.DefaultWorkingHours
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamExecutionType}
import models.facility.ExamRoom
import models.user.{Language, User}
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import org.scalatest.BeforeAndAfterEach
import play.api.http.Status
import play.api.libs.json.{JsNumber, Json}
import play.api.test.Helpers._

import java.util.concurrent.{CountDownLatch, TimeUnit}
import scala.concurrent.Future
import scala.jdk.CollectionConverters._

class CalendarControllerSpec extends BaseIntegrationSpec with BeforeAndAfterEach with EbeanQueryExtensions:

  private val MAIL_TIMEOUT = 5000L

  // GreenMail setup for email testing - using GreenMail directly instead of JUnit rule
  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  override def beforeEach(): Unit =
    super.beforeEach()
    startGreenMail()
    greenMail.purgeEmailFromAllMailboxes()

  override def afterEach(): Unit =
    try
      stopGreenMail()
    finally
      super.afterEach()

  private def setupTestData(): (Exam, ExamRoom, Reservation, ExamEnrolment) =
    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val exam = DB.find(classOf[Exam]).where().eq("state", Exam.State.PUBLISHED).list.headOption match
      case Some(e) => e
      case None    => fail("No published exam found")

    val user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) =>
        u.setLanguage(DB.find(classOf[Language]).where().eq("code", "en").find.orNull)
        u.update()
        u
      case None => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) =>
        r.setRoomInstructionEN("information in English here")
        r.update()
        r
      case None => fail("Test room not found")

    setWorkingHours(room)

    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)
    enrolment.save()

    val reservation = new Reservation()
    reservation.setUser(user)
    (exam, room, reservation, enrolment)

  private def setWorkingHours(room: ExamRoom): Unit =
    val dates = Array("MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY")
    dates.foreach { day =>
      val dwh = new DefaultWorkingHours()
      dwh.setWeekday(day)
      dwh.setRoom(room)
      dwh.setStartTime(DateTime.now().withTimeAtStartOfDay())
      dwh.setEndTime(dwh.getStartTime.withTime(20, 59, 59, 999))
      dwh.setTimezoneOffset(7200000)
      dwh.save()
    }

  "CalendarController" when:
    "creating reservations concurrently" should:
      "handle concurrent reservation requests safely" in:
        val (user, session)    = runIO(loginAsStudent())
        val (exam, room, _, _) = setupTestData()
        // Setup private exam
        exam.setExecutionType(Option(DB.find(classOf[ExamExecutionType], 2L)).orNull)
        exam.getExamOwners.add(Option(DB.find(classOf[User], 4L)).orNull)
        exam.save()

        val start = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(12)
        val end = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(13)

        val callCount = 10
        val latch     = new CountDownLatch(callCount)
        val statuses  = scala.collection.mutable.ListBuffer.empty[Int]

        println(s"Starting $callCount concurrent reservation requests...")

        // Create concurrent requests
        (0 until callCount).foreach { i =>
          Future {
            try
              val reservationData = Json.obj(
                "roomId" -> JsNumber(BigDecimal(room.getId)),
                "examId" -> JsNumber(BigDecimal(exam.getId)),
                "start"  -> ISODateTimeFormat.dateTime().print(start),
                "end"    -> ISODateTimeFormat.dateTime().print(end)
              )
              val result =
                runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
              statuses.synchronized {
                statuses += statusOf(result)
              }
            catch
              case e: Exception =>
                println(s"Request failed: ${e.getMessage}")
            finally latch.countDown()
          }(using scala.concurrent.ExecutionContext.global)
        }

        // Wait for all requests to complete
        latch.await(MAIL_TIMEOUT + 1000, TimeUnit.MILLISECONDS) must be(true)
        println(s"All HTTP requests completed. Status codes: ${statuses.toList}")
        statuses.toList.forall(_ == Status.OK) must be(true)

        // Wait for email scheduling delay
        println("Waiting for all emails to be scheduled and sent...")
        Thread.sleep(2500)

        // Check emails
        val currentEmails = greenMail.getReceivedMessages.length
        println(s"Total emails received: $currentEmails/$callCount")

        val emailsReceived = currentEmails >= callCount ||
          greenMail.waitForIncomingEmail(MAIL_TIMEOUT, callCount - currentEmails)
        emailsReceived must be(true)

        // Verify only one reservation was created
        val reservationCount = DB.find(classOf[Reservation]).where().eq("user.id", user.getId).list.size
        reservationCount must be(1)

    "creating single reservations" should:
      "create reservation successfully" in:
        val (user, session)            = runIO(loginAsStudent())
        val (exam, room, _, enrolment) = setupTestData()
        // Setup private exam
        exam.setExecutionType(Option(DB.find(classOf[ExamExecutionType], 2L)).orNull)
        exam.getExamOwners.add(Option(DB.find(classOf[User], 4L)).orNull)
        exam.save()

        val start = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(12)
        val end = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(13)

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.OK))

        // Verify reservation
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) =>
            ee.getReservation must not be null
            ee.getReservation.getStartAt must be(start)
            ee.getReservation.getEndAt must be(end)
            ee.getExam.getId must be(exam.getId)
            room.getExamMachines.asScala must contain(ee.getReservation.getMachine)
          case None => fail("Enrolment not found")

        // Check email
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1
        mails(0).getFrom()(0).toString must include("no-reply@exam.org")
        val body = GreenMailUtil.getBody(mails(0))
        body must include("You have booked an exam time")
        body must include("information in English here")
        body must include(room.getName)

      "create reservation when previous reservation is in future" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, room, reservation, enrolment) = setupTestData()
        val start = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(12)
        val end = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(13)

        // Setup existing future reservation
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.OK))

        // Verify new reservation replaced old one
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) =>
            ee.getReservation must not be null
            ee.getReservation.getStartAt must be(start)
            ee.getReservation.getEndAt must be(end)
            ee.getExam.getId must be(exam.getId)
            room.getExamMachines.asScala must contain(ee.getReservation.getMachine)
          case None => fail("Enrolment not found")

        // Check email
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1

      "create reservation when previous reservation is in past" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, room, reservation, enrolment) = setupTestData()
        val start = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(12)
        val end = DateTime
          .now()
          .withMinuteOfHour(0)
          .withSecondOfMinute(0)
          .withMillisOfSecond(0)
          .plusDays(1)
          .withHourOfDay(13)

        // Setup past reservation with no-show
        reservation.setStartAt(DateTime.now().minusDays(1).minusMinutes(10))
        reservation.setEndAt(DateTime.now().minusDays(1).minusMinutes(5))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.setNoShow(true)
        enrolment.update()

        // Create new enrolment
        val newEnrolment = new ExamEnrolment()
        newEnrolment.setEnrolledOn(DateTime.now())
        newEnrolment.setExam(exam)
        newEnrolment.setUser(user)
        newEnrolment.save()

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.OK))

        // Verify new reservation
        Option(DB.find(classOf[ExamEnrolment], newEnrolment.getId)) match
          case Some(ee) =>
            ee.getReservation must not be null
            ee.getReservation.getStartAt must be(start)
            ee.getReservation.getEndAt must be(end)
            ee.getExam.getId must be(exam.getId)
            room.getExamMachines.asScala must contain(ee.getReservation.getMachine)
          case None => fail("New enrolment not found")

        // Check email
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1

    "handling invalid reservations" should:
      "reject reservation with start time in past" in:
        val (user, session)            = runIO(loginAsStudent())
        val (exam, room, _, enrolment) = setupTestData()
        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).minusHours(1)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2)

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.BAD_REQUEST))

        // Verify no reservation created
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation must be(null)
          case None     => fail("Enrolment not found")

      "reject reservation that ends before it starts" in:
        val (user, session)            = runIO(loginAsStudent())
        val (exam, room, _, enrolment) = setupTestData()
        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1)

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.BAD_REQUEST))

        // Verify no reservation created
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation must be(null)
          case None     => fail("Enrolment not found")

      "reject reservation when previous reservation is in effect" in:
        val (user, session)                      = runIO(loginAsStudent())
        val (exam, room, reservation, enrolment) = setupTestData()
        val start = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(1)
        val end   = DateTime.now().withMinuteOfHour(0).withSecondOfMinute(0).withMillisOfSecond(0).plusHours(2)

        // Setup current reservation
        reservation.setStartAt(DateTime.now().minusMinutes(10))
        reservation.setEndAt(DateTime.now().plusMinutes(10))
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val reservationData = Json.obj(
          "roomId" -> JsNumber(BigDecimal(room.getId)),
          "examId" -> JsNumber(BigDecimal(exam.getId)),
          "start"  -> ISODateTimeFormat.dateTime().print(start),
          "end"    -> ISODateTimeFormat.dateTime().print(end)
        )

        val result = runIO(makeRequest(POST, "/app/calendar/reservation", Some(reservationData), session = session))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result) must be("i18n_error_enrolment_not_found")

        // Verify original reservation unchanged
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation.getId must be(reservation.getId)
          case None     => fail("Enrolment not found")

    "removing reservations" should:
      "remove future reservation successfully" in:
        val (user, session)                   = runIO(loginAsStudent())
        val (_, room, reservation, enrolment) = setupTestData()
        // Setup future reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().plusHours(2))
        reservation.setEndAt(DateTime.now().plusHours(3))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(delete(s"/app/calendar/reservation/${reservation.getId}", session = session))
        statusOf(result).must(be(Status.OK))
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)

        // Verify reservation removed
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation must be(null)
          case None     => fail("Enrolment not found")

        DB.find(classOf[Reservation]).where().eq("id", reservation.getId).find must be(None)

      "reject removal of past reservation" in:
        val (user, session)                   = runIO(loginAsStudent())
        val (_, room, reservation, enrolment) = setupTestData()
        // Setup past reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().minusHours(2))
        reservation.setEndAt(DateTime.now().minusHours(1))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(delete(s"/app/calendar/reservation/${reservation.getId}", session = session))
        statusOf(result).must(be(Status.FORBIDDEN))

        // Verify reservation unchanged
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation.getId must be(reservation.getId)
          case None     => fail("Enrolment not found")

      "reject removal of reservation in progress" in:
        val (user, session)                   = runIO(loginAsStudent())
        val (_, room, reservation, enrolment) = setupTestData()
        // Setup current reservation
        reservation.setMachine(room.getExamMachines.get(0))
        reservation.setStartAt(DateTime.now().minusHours(1))
        reservation.setEndAt(DateTime.now().plusHours(1))
        reservation.save()
        enrolment.setReservation(reservation)
        enrolment.update()

        val result = runIO(delete(s"/app/calendar/reservation/${reservation.getId}", session = session))
        statusOf(result).must(be(Status.FORBIDDEN))

        // Verify reservation unchanged
        Option(DB.find(classOf[ExamEnrolment], enrolment.getId)) match
          case Some(ee) => ee.getReservation.getId must be(reservation.getId)
          case None     => fail("Enrolment not found")
