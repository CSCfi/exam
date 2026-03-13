// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import database.EbeanQueryExtensions
import io.ebean.text.PathProperties
import io.ebean.{DB, Database}
import models.enrolment.ExamEnrolment
import models.exam.{ExamImplementation, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import org.apache.commons.codec.binary.Base64
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone, Minutes}
import play.api.mvc.{AnyContent, Request, RequestHeader}
import play.api.{Environment, Logging, Mode}
import security.BlockingIOExecutionContext
import services.config.{ByodConfigHandler, ConfigReader}
import services.datetime.{AppClock, DateTimeHandler}

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class EnrolmentRepository @Inject() (
    environment: Environment,
    blockingIOExecutionContext: BlockingIOExecutionContext,
    byodConfigHandler: ByodConfigHandler,
    dateTimeHandler: DateTimeHandler,
    configReader: ConfigReader,
    clock: AppClock
) extends Logging
    with EbeanQueryExtensions:

  private val db: Database                  = DB.getDefault
  private implicit val ec: ExecutionContext = blockingIOExecutionContext

  def getReservationHeaders(
      request: Request[AnyContent],
      userId: Long,
      eppn: String
  ): Future[Map[String, String]] =
    Future(doGetReservationHeaders(request, userId, eppn))

  def getStudentEnrolments(user: User): Future[List[ExamEnrolment]] =
    Future(doGetStudentEnrolments(user))

  def getRoomInfoForEnrolment(hash: String, user: User): Future[Option[ExamRoom]] =
    Future {
      val baseQuery = DB
        .find(classOf[ExamEnrolment])
        .fetch("user", "id")
        .fetch("user.language")
        .fetch("reservation.machine.room", "roomInstruction, roomInstructionEN, roomInstructionSV")
        .where()
        .disjunction()
        .eq("exam.hash", hash)
        .eq("externalExam.hash", hash)
        .endJunction()
        .isNotNull("reservation.machine.room")

      val query =
        if user.hasRole(Role.Name.STUDENT) then baseQuery.eq("user", user)
        else baseQuery

      Option(query.findOne()).map(_.reservation.machine.room)
    }

  private def doGetStudentEnrolments(user: User): List[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(clock.now())
    val pp = PathProperties.parse(
      """(*,
        |examinationEventConfiguration(
        |  examinationEvent(*)
        |),
        |collaborativeExam(*),
        |exam(*,
        |  examinationEventConfigurations(
        |    examinationEvent(*)
        |  ),
        |  executionType(*),
        |  examSections(*),
        |  course(*),
        |  examLanguages(*),
        |  examOwners(*),
        |  examInspections(*, user(*))
        |),
        |reservation(*,
        |  externalReservation(*,
        |    mailAddress(*)
        |  ),
        |  machine(*,
        |    room(*)
        |  )
        |),
        |optionalSections(*,
        |  examMaterials(*)
        |)
        |)""".stripMargin
    )
    val query = db.find(classOf[ExamEnrolment])
    pp.apply(query)
    val enrolments = query
      .where()
      .eq("user", user)
      .or()
      .gt("reservation.endAt", now.toDate)
      .isNull("reservation")
      .endOr()
      .list
      .filter { ee =>
        Option(ee.examinationEventConfiguration) match
          case None => true
          case Some(config) =>
            val start = config.examinationEvent.start
            start.plusMinutes(ee.exam.duration).isAfterNow
      }

    // Hide section info if no optional sections exist
    enrolments.foreach { ee =>
      Option(ee.exam).foreach { exam =>
        if !exam.examSections.asScala.exists(_.optional) then exam.examSections.clear()
      }
    }

    enrolments.filter { ee =>
      Option(ee.exam).flatMap(e => Option(e.periodEnd)) match
        case Some(periodEnd) =>
          periodEnd.isAfterNow && ee.exam.hasState(
            ExamState.PUBLISHED,
            ExamState.STUDENT_STARTED
          )
        case None =>
          Option(ee.collaborativeExam).exists(_.periodEnd.isAfterNow)
    }

  private def doGetReservationHeaders(
      request: RequestHeader,
      userId: Long,
      eppn: String
  ): Map[String, String] =
    val headers = scala.collection.mutable.Map[String, String]()
    getNextEnrolment(userId, 0) match
      case Some(ongoingEnrolment) =>
        handleOngoingEnrolment(ongoingEnrolment, request, headers, eppn)
      case None =>
        val now = clock.now()
        val lookAheadMinutes =
          Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes
        getNextEnrolment(userId, lookAheadMinutes) match
          case Some(upcomingEnrolment) =>
            handleUpcomingEnrolment(upcomingEnrolment, request, headers, eppn)
          case None if isOnExamMachine(request) =>
            // User is logged on an exam machine but has no exams for today
            headers.put("x-exam-upcoming-exam", "none")
          case _ =>

    headers.toMap

  def isOnExamMachine(remoteAddress: String): Boolean =
    db.find(classOf[ExamMachine]).where().eq("ipAddress", remoteAddress).find.isDefined

  private def isOnExamMachine(request: RequestHeader): Boolean =
    isOnExamMachine(request.remoteAddress)

  private def isMachineOk(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String],
      eppn: String
  ): Boolean =
    val requiresReservation =
      Option(enrolment.externalExam).isDefined ||
        Option(enrolment.collaborativeExam).isDefined ||
        Option(enrolment.exam).exists(_.implementation == ExamImplementation.AQUARIUM)

    // Lose the checks for dev usage to facilitate for easier testing
    if environment.mode == Mode.Dev && requiresReservation then true
    else
      val requiresClientAuth =
        Option(enrolment.exam).exists(_.implementation == ExamImplementation.CLIENT_AUTH)

      if requiresClientAuth then
        logger.info("Checking SEB config...")
        // SEB examination
        val config = enrolment.examinationEventConfiguration
        val error =
          byodConfigHandler.checkUserAgent(
            request.headers.toMap,
            request.uri,
            request.host,
            config.configKey
          )

        if error.isDefined then
          val msg =
            ISODateTimeFormat.dateTime().print(new DateTime(config.examinationEvent.start))
          headers.put("x-exam-wrong-agent-config", msg)
          logger.warn("Wrong agent config for SEB")
          false
        else
          logger.info("SEB config OK")
          true
      else if requiresReservation then
        // Aquarium examination
        val examMachine = enrolment.reservation.machine
        val room        = examMachine.room
        val machineIp   = examMachine.ipAddress
        val remoteIp    = request.remoteAddress

        logger.debug(s"User is on IP: $remoteIp <-> Should be on IP: $machineIp")

        if remoteIp != machineIp then
          val (header, message) =
            // Is this a known machine?
            Option(db.find(classOf[ExamMachine]).where().eq("ipAddress", remoteIp).findOne()) match
              case None =>
                // IP is not known
                val local = configReader.isLocalUser(eppn)
                val zone  = DateTimeZone.forID(room.localTimezone)
                val start = {
                  ISODateTimeFormat.dateTime().withZone(zone).print(new DateTime(
                    enrolment.reservation.startAt
                  ))
                }
                val msg = Seq(
                  enrolment.id,
                  room.campus,
                  room.buildingName,
                  room.roomCode,
                  examMachine.name,
                  start,
                  zone.getID,
                  if local then "true" else enrolment.id
                ).mkString(":::")
                ("x-exam-unknown-machine", msg)
              case Some(lookedUp) if lookedUp.room.id == room.id =>
                // Right room, wrong machine
                ("x-exam-wrong-machine", s"${enrolment.id}:::${lookedUp.id}")
              case Some(lookedUp) =>
                // Wrong room
                ("x-exam-wrong-room", s"${enrolment.id}:::${lookedUp.id}")

          headers.put(header, Base64.encodeBase64String(message.getBytes))
          logger.debug(s"room and machine not ok. $message")
          false
        else true
      else true

  private def getExamHash(enrolment: ExamEnrolment): String =
    Option(enrolment.externalExam)
      .map(_.hash)
      .orElse(Option(enrolment.collaborativeExam).filter(_ =>
        Option(enrolment.exam).isEmpty
      ).map(_.hash))
      .getOrElse(Option(enrolment.exam).map(_.hash).get)

  private def handleOngoingEnrolment(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String],
      eppn: String
  ): Unit =
    if isMachineOk(enrolment, request, headers, eppn) then
      val hash = getExamHash(enrolment)
      headers.put("x-exam-start-exam", hash)

  private def handleUpcomingEnrolment(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String],
      eppn: String
  ): Unit =
    if Option(enrolment.exam).exists(_.implementation == ExamImplementation.WHATEVER) then
      // Home exam, don't set headers unless it starts in 5 minutes
      val threshold = clock.now().plusMinutes(5)
      val start     = enrolment.examinationEventConfiguration.examinationEvent.start
      if start.isBefore(threshold) then
        headers.put("x-exam-upcoming-exam", s"$getExamHash(enrolment)}:::${enrolment.id}")
    else if isMachineOk(enrolment, request, headers, eppn) then
      if Option(enrolment.exam).exists(_.implementation == ExamImplementation.AQUARIUM) then
        // Aquarium exam
        val threshold      = clock.now().plusMinutes(5)
        val thresholdEarly = clock.now().withTimeAtStartOfDay().plusDays(1)
        val start =
          dateTimeHandler.normalize(enrolment.reservation.startAt, enrolment.reservation)
        // if start is within 5 minutes, set the upcoming exam header
        if start.isBefore(threshold) then
          headers.put("x-exam-upcoming-exam", s"$getExamHash(enrolment)}:::${enrolment.id}")
        // otherwise set the early login header if start is within today. For dev purposes skip requirement
        else if start.isBefore(thresholdEarly) && start.isAfterNow && environment.mode != Mode.Dev
        then
          headers.put("x-exam-aquarium-login", s"$getExamHash(enrolment)}:::${enrolment.id}")
      else
        // SEB exam
        headers.put("x-exam-upcoming-exam", s"$getExamHash(enrolment)}:::${enrolment.id}")

  private def isInsideBounds(ee: ExamEnrolment, minutesToFuture: Int): Boolean =
    val earliest = Option(ee.examinationEventConfiguration) match
      case None    => dateTimeHandler.adjustDST(clock.now())
      case Some(_) => clock.now()
    val latest = earliest.plusMinutes(minutesToFuture)
    val delay  = ee.delay

    Option(ee.reservation).exists { reservation =>
      reservation.startAt.plusMillis(delay).isBefore(latest) &&
      reservation.endAt.isAfter(earliest)
    } ||
    Option(ee.examinationEventConfiguration).map(_.examinationEvent).exists { event =>
      event.start.plusMillis(delay).isBefore(latest) &&
      event.start.plusMinutes(ee.exam.duration).isAfter(earliest)
    }

  private def getStartTime(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.reservation) match
      case Some(reservation) =>
        reservation.startAt.plusMillis(enrolment.delay)
      case None =>
        enrolment.examinationEventConfiguration.examinationEvent.start.plusMillis(
          enrolment.delay
        )

  private def getNextEnrolment(userId: Long, minutesToFuture: Int): Option[ExamEnrolment] =
    val results = db
      .find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("reservation.machine")
      .fetch("reservation.machine.room")
      .fetch("examinationEventConfiguration")
      .fetch("examinationEventConfiguration.examinationEvent")
      .fetch("exam")
      .fetch("externalExam")
      .fetch("collaborativeExam")
      .where()
      .eq("user.id", userId)
      .or()
      .eq("exam.state", ExamState.PUBLISHED)
      .eq("exam.state", ExamState.STUDENT_STARTED)
      .eq("exam.state", ExamState.INITIALIZED)
      .and()
      .isNull("exam")
      .eq("collaborativeExam.state", ExamState.PUBLISHED)
      .endAnd()
      .jsonEqualTo("externalExam.content", "state", ExamState.PUBLISHED.toString)
      .jsonEqualTo("externalExam.content", "state", ExamState.STUDENT_STARTED.toString)
      .endOr()
      .or()
      .isNotNull("reservation.machine")
      .isNotNull("examinationEventConfiguration")
      .endOr()
      .distinct

    // filter out enrolments that are over or not starting until tomorrow and pick the earliest (if any)
    results.filter(isInsideBounds(_, minutesToFuture)).minByOption(getStartTime)
