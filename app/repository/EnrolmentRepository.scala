// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import io.ebean.text.PathProperties
import io.ebean.{DB, Database}
import models.enrolment.ExamEnrolment
import models.exam.{ExamImplementation, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import org.apache.commons.codec.binary.Base64
import play.api.mvc.{AnyContent, Request, RequestHeader}
import play.api.{Environment, Logging, Mode}
import security.BlockingIOExecutionContext
import services.config.{ByodConfigHandler, ConfigReader}
import services.datetime.AppClock
import services.datetime.TimeUtils

import java.time.*
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class EnrolmentRepository @Inject() (
    environment: Environment,
    blockingIOExecutionContext: BlockingIOExecutionContext,
    byodConfigHandler: ByodConfigHandler,
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
        .fetch(path[ExamEnrolment]("user"), "id")
        .fetch(path[ExamEnrolment]("user.language"))
        .fetch(
          path[ExamEnrolment]("reservation.machine.room"),
          "roomInstruction, roomInstructionEN, roomInstructionSV"
        )
        .where()
        .disjunction()
        .eq(path[ExamEnrolment]("exam.hash"), hash)
        .eq(path[ExamEnrolment]("externalExam.hash"), hash)
        .endJunction()
        .isNotNull(path[ExamEnrolment]("reservation.machine.room"))

      val query =
        if user.hasRole(Role.Name.STUDENT) then baseQuery.eq(path[ExamEnrolment]("user"), user)
        else baseQuery

      Option(query.findOne()).map(_.reservation.machine.room)
    }

  private def doGetStudentEnrolments(user: User): List[ExamEnrolment] =
    val now = clock.now()
    val pp = props[ExamEnrolment](
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
    val enrolments = db.find(classOf[ExamEnrolment])
      .apply(pp)
      .where()
      .eq(path[ExamEnrolment]("user"), user)
      .or()
      .gt(path[ExamEnrolment]("reservation.endAt"), now)
      .isNull(path[ExamEnrolment]("reservation"))
      .endOr()
      .list
      .filter { ee =>
        Option(ee.examinationEventConfiguration) match
          case None => true
          case Some(config) =>
            val start = config.examinationEvent.start
            start.plus(Duration.ofMinutes(ee.exam.duration.toLong)).isAfter(Instant.now())
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
          periodEnd.isAfter(Instant.now()) && ee.exam.hasState(
            ExamState.PUBLISHED,
            ExamState.STUDENT_STARTED
          )
        case None =>
          Option(ee.collaborativeExam).exists(_.periodEnd.isAfter(Instant.now()))
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
          Duration.between(
            now,
            LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant
          ).toMinutes.toInt
        getNextEnrolment(userId, lookAheadMinutes) match
          case Some(upcomingEnrolment) =>
            handleUpcomingEnrolment(upcomingEnrolment, request, headers, eppn)
          case None if isOnExamMachine(request) =>
            // User is logged on an exam machine but has no exams for today
            headers.put("x-exam-upcoming-exam", "none")
          case _ =>

    headers.toMap

  def isOnExamMachine(remoteAddress: String): Boolean =
    db.find(classOf[ExamMachine]).where().eq(
      path[ExamMachine]("ipAddress"),
      remoteAddress
    ).find.isDefined

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
          val msg = DateTimeFormatter.ISO_INSTANT.format(config.examinationEvent.start)
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
            Option(db.find(classOf[ExamMachine]).where().eq(
              path[ExamMachine]("ipAddress"),
              remoteIp
            ).findOne()) match
              case None =>
                // IP is not known
                val local = configReader.isLocalUser(eppn)
                val zone  = TimeUtils.zoneIdOf(room.localTimezone)
                val start = ZonedDateTime.ofInstant(enrolment.reservation.startAt, zone)
                  .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME)
                val msg = Seq(
                  enrolment.id,
                  room.campus,
                  room.buildingName,
                  room.roomCode,
                  examMachine.name,
                  start,
                  room.localTimezone,
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
      val threshold = clock.now().plus(Duration.ofMinutes(5))
      val start     = enrolment.examinationEventConfiguration.examinationEvent.start
      if start.isBefore(threshold) then
        headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.id}")
    else if isMachineOk(enrolment, request, headers, eppn) then
      if Option(enrolment.exam).exists(_.implementation == ExamImplementation.AQUARIUM) then
        // Aquarium exam
        val threshold = clock.now().plus(Duration.ofMinutes(5))
        val thresholdEarly =
          LocalDate.now(ZoneOffset.UTC).plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant
        val start = enrolment.reservation.startAt
        // if start is within 5 minutes, set the upcoming exam header
        if start.isBefore(threshold) then
          headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.id}")
        // otherwise set the early login header if start is within today. For dev purposes skip requirement
        else if start.isBefore(thresholdEarly) && start.isAfter(
            clock.now()
          ) && environment.mode != Mode.Dev
        then
          headers.put("x-exam-aquarium-login", s"${getExamHash(enrolment)}:::${enrolment.id}")
      else
        // SEB exam
        headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.id}")

  private def isInsideBounds(ee: ExamEnrolment, minutesToFuture: Int): Boolean =
    val earliest = clock.now()
    val latest   = earliest.plus(Duration.ofMinutes(minutesToFuture.toLong))
    val delay    = ee.delay

    Option(ee.reservation).exists { reservation =>
      reservation.startAt.plusMillis(delay).isBefore(latest) &&
      reservation.endAt.isAfter(earliest)
    } ||
    Option(ee.examinationEventConfiguration).map(_.examinationEvent).exists { event =>
      event.start.plusMillis(delay).isBefore(latest) &&
      event.start.plus(Duration.ofMinutes(ee.exam.duration.toLong)).isAfter(earliest)
    }

  private def getStartTime(enrolment: ExamEnrolment): Instant =
    Option(enrolment.reservation) match
      case Some(reservation) =>
        reservation.startAt.plusMillis(enrolment.delay)
      case None =>
        enrolment.examinationEventConfiguration.examinationEvent.start.plusMillis(enrolment.delay)

  private def getNextEnrolment(userId: Long, minutesToFuture: Int): Option[ExamEnrolment] =
    val results = db
      .find(classOf[ExamEnrolment])
      .fetch(path[ExamEnrolment]("reservation"))
      .fetch(path[ExamEnrolment]("reservation.machine"))
      .fetch(path[ExamEnrolment]("reservation.machine.room"))
      .fetch(path[ExamEnrolment]("examinationEventConfiguration"))
      .fetch(path[ExamEnrolment]("examinationEventConfiguration.examinationEvent"))
      .fetch(path[ExamEnrolment]("exam"))
      .fetch(path[ExamEnrolment]("externalExam"))
      .fetch(path[ExamEnrolment]("collaborativeExam"))
      .where()
      .eq(path[ExamEnrolment]("user.id"), userId)
      .or()
      .eq(path[ExamEnrolment]("exam.state"), ExamState.PUBLISHED)
      .eq(path[ExamEnrolment]("exam.state"), ExamState.STUDENT_STARTED)
      .eq(path[ExamEnrolment]("exam.state"), ExamState.INITIALIZED)
      .and()
      .isNull(path[ExamEnrolment]("exam"))
      .eq(path[ExamEnrolment]("collaborativeExam.state"), ExamState.PUBLISHED)
      .endAnd()
      .jsonEqualTo(
        path[ExamEnrolment]("externalExam.content"),
        "state",
        ExamState.PUBLISHED.toString
      )
      .jsonEqualTo(
        path[ExamEnrolment]("externalExam.content"),
        "state",
        ExamState.STUDENT_STARTED.toString
      )
      .endOr()
      .or()
      .isNotNull(path[ExamEnrolment]("reservation.machine"))
      .isNotNull(path[ExamEnrolment]("examinationEventConfiguration"))
      .endOr()
      .distinct

    // filter out enrolments that are over or not starting until tomorrow and pick the earliest (if any)
    results.filter(isInsideBounds(_, minutesToFuture)).minByOption(getStartTime)
