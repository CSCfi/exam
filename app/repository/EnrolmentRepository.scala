// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import io.ebean.text.PathProperties
import io.ebean.{DB, Database}
import database.EbeanQueryExtensions
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.user.{Role, User}
import org.apache.commons.codec.binary.Base64
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone, Minutes}
import play.api.mvc.{AnyContent, Request, RequestHeader}
import play.api.{Environment, Logging, Mode}
import services.config.ByodConfigHandler
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import security.BlockingIOExecutionContext

class EnrolmentRepository @Inject() (
    environment: Environment,
    blockingIOExecutionContext: BlockingIOExecutionContext,
    byodConfigHandler: ByodConfigHandler,
    dateTimeHandler: DateTimeHandler
) extends Logging
    with EbeanQueryExtensions:

  private val db: Database                  = DB.getDefault
  private implicit val ec: ExecutionContext = blockingIOExecutionContext

  def getReservationHeaders(
      request: Request[AnyContent],
      userId: Long
  ): Future[Map[String, String]] =
    Future(doGetReservationHeaders(request, userId))

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

      Option(query.findOne()).map(_.getReservation.getMachine.getRoom)
    }

  private def doGetStudentEnrolments(user: User): List[ExamEnrolment] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
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
        Option(ee.getExaminationEventConfiguration) match
          case None => true
          case Some(config) =>
            val start = config.getExaminationEvent.getStart
            start.plusMinutes(ee.getExam.getDuration).isAfterNow
      }

    // Hide section info if no optional sections exist
    enrolments.foreach { ee =>
      Option(ee.getExam).foreach { exam =>
        if !exam.getExamSections.asScala.exists(_.isOptional) then exam.getExamSections.clear()
      }
    }

    enrolments.filter { ee =>
      Option(ee.getExam).flatMap(e => Option(e.getPeriodEnd)) match
        case Some(periodEnd) =>
          periodEnd.isAfterNow && ee.getExam.hasState(
            Exam.State.PUBLISHED,
            Exam.State.STUDENT_STARTED
          )
        case None =>
          Option(ee.getCollaborativeExam).exists(_.getPeriodEnd.isAfterNow)
    }

  private def doGetReservationHeaders(request: RequestHeader, userId: Long): Map[String, String] =
    val headers = scala.collection.mutable.Map[String, String]()
    getNextEnrolment(userId, 0) match
      case Some(ongoingEnrolment) =>
        handleOngoingEnrolment(ongoingEnrolment, request, headers)
      case None =>
        val now = DateTime.now()
        val lookAheadMinutes =
          Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes
        getNextEnrolment(userId, lookAheadMinutes) match
          case Some(upcomingEnrolment) =>
            handleUpcomingEnrolment(upcomingEnrolment, request, headers)
          case None if isOnExamMachine(request) =>
            // User is logged on an exam machine but has no exams for today
            headers.put("x-exam-upcoming-exam", "none")
          case _ =>

    headers.toMap

  private def isOnExamMachine(request: RequestHeader): Boolean =
    db.find(classOf[ExamMachine]).where().eq("ipAddress", request.remoteAddress).find.isDefined

  private def isMachineOk(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String]
  ): Boolean =
    val requiresReservation =
      Option(enrolment.getExternalExam).isDefined ||
        Option(enrolment.getCollaborativeExam).isDefined ||
        Option(enrolment.getExam).exists(_.getImplementation == Exam.Implementation.AQUARIUM)

    // Lose the checks for dev usage to facilitate for easier testing
    if environment.mode == Mode.Dev && requiresReservation then return true

    val requiresClientAuth =
      Option(enrolment.getExam).exists(_.getImplementation == Exam.Implementation.CLIENT_AUTH)

    if requiresClientAuth then
      logger.info("Checking SEB config...")
      // SEB examination
      val config = enrolment.getExaminationEventConfiguration
      val error =
        byodConfigHandler.checkUserAgent(
          request.headers.toMap,
          request.uri,
          request.host,
          config.getConfigKey
        )

      if error.isDefined then
        val msg =
          ISODateTimeFormat.dateTime().print(new DateTime(config.getExaminationEvent.getStart))
        headers.put("x-exam-wrong-agent-config", msg)
        logger.warn("Wrong agent config for SEB")
        return false
      else logger.info("SEB config OK")
    else if requiresReservation then
      // Aquarium examination
      val examMachine = enrolment.getReservation.getMachine
      val room        = examMachine.getRoom
      val machineIp   = examMachine.getIpAddress
      val remoteIp    = request.remoteAddress

      logger.debug(s"User is on IP: $remoteIp <-> Should be on IP: $machineIp")

      if remoteIp != machineIp then
        val (header, message) =
          // Is this a known machine?
          Option(db.find(classOf[ExamMachine]).where().eq("ipAddress", remoteIp).findOne()) match
            case None =>
              // IP is not known
              val zone = DateTimeZone.forID(room.getLocalTimezone)
              val start =
                ISODateTimeFormat.dateTime().withZone(zone).print(new DateTime(
                  enrolment.getReservation.getStartAt
                ))
              val msg =
                s"${room.getCampus}:::${room.getBuildingName}:::${room.getRoomCode}:::${examMachine.getName}:::$start:::${zone.getID}"
              ("x-exam-unknown-machine", msg)
            case Some(lookedUp) if lookedUp.getRoom.getId == room.getId =>
              // Right room, wrong machine
              ("x-exam-wrong-machine", s"${enrolment.getId}:::${lookedUp.getId}")
            case Some(lookedUp) =>
              // Wrong room
              ("x-exam-wrong-room", s"${enrolment.getId}:::${lookedUp.getId}")

        headers.put(header, Base64.encodeBase64String(message.getBytes))
        logger.debug(s"room and machine not ok. $message")
        return false

    true

  private def getExamHash(enrolment: ExamEnrolment): String =
    Option(enrolment.getExternalExam)
      .map(_.getHash)
      .orElse(Option(enrolment.getCollaborativeExam).filter(_ =>
        Option(enrolment.getExam).isEmpty
      ).map(_.getHash))
      .getOrElse(Option(enrolment.getExam).map(_.getHash).get)

  private def handleOngoingEnrolment(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String]
  ): Unit =
    if isMachineOk(enrolment, request, headers) then
      val hash = getExamHash(enrolment)
      headers.put("x-exam-start-exam", hash)

  private def handleUpcomingEnrolment(
      enrolment: ExamEnrolment,
      request: RequestHeader,
      headers: scala.collection.mutable.Map[String, String]
  ): Unit =
    if Option(enrolment.getExam).exists(_.getImplementation == Exam.Implementation.WHATEVER) then
      // Home exam, don't set headers unless it starts in 5 minutes
      val threshold = DateTime.now().plusMinutes(5)
      val start     = enrolment.getExaminationEventConfiguration.getExaminationEvent.getStart
      if start.isBefore(threshold) then
        headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.getId}")
    else if isMachineOk(enrolment, request, headers) then
      if Option(enrolment.getExam).exists(_.getImplementation == Exam.Implementation.AQUARIUM) then
        // Aquarium exam
        val threshold      = DateTime.now().plusMinutes(5)
        val thresholdEarly = DateTime.now().withTimeAtStartOfDay().plusDays(1)
        val start =
          dateTimeHandler.normalize(enrolment.getReservation.getStartAt, enrolment.getReservation)
        // if start is within 5 minutes, set the upcoming exam header
        if start.isBefore(threshold) then
          headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.getId}")
        // otherwise set the early login header if start is within today. For dev purposes skip requirement
        else if start.isBefore(thresholdEarly) && start.isAfterNow && environment.mode != Mode.Dev
        then
          headers.put("x-exam-aquarium-login", s"${getExamHash(enrolment)}:::${enrolment.getId}")
      else
        // SEB exam
        headers.put("x-exam-upcoming-exam", s"${getExamHash(enrolment)}:::${enrolment.getId}")

  private def isInsideBounds(ee: ExamEnrolment, minutesToFuture: Int): Boolean =
    val earliest = Option(ee.getExaminationEventConfiguration) match
      case None    => dateTimeHandler.adjustDST(DateTime.now())
      case Some(_) => DateTime.now()
    val latest = earliest.plusMinutes(minutesToFuture)
    val delay  = ee.getDelay

    Option(ee.getReservation).exists { reservation =>
      reservation.getStartAt.plusMillis(delay).isBefore(latest) &&
      reservation.getEndAt.isAfter(earliest)
    } ||
    Option(ee.getExaminationEventConfiguration).map(_.getExaminationEvent).exists { event =>
      event.getStart.plusMillis(delay).isBefore(latest) &&
      event.getStart.plusMinutes(ee.getExam.getDuration).isAfter(earliest)
    }

  private def getStartTime(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.getReservation) match
      case Some(reservation) =>
        reservation.getStartAt.plusMillis(enrolment.getDelay)
      case None =>
        enrolment.getExaminationEventConfiguration.getExaminationEvent.getStart.plusMillis(
          enrolment.getDelay
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
      .disjunction()
      .eq("exam.state", Exam.State.PUBLISHED)
      .eq("exam.state", Exam.State.STUDENT_STARTED)
      .eq("exam.state", Exam.State.INITIALIZED)
      .and()
      .isNull("exam")
      .eq("collaborativeExam.state", Exam.State.PUBLISHED)
      .endAnd()
      .jsonEqualTo("externalExam.content", "state", Exam.State.PUBLISHED.toString)
      .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString)
      .endJunction()
      .or()
      .isNotNull("reservation.machine")
      .isNotNull("examinationEventConfiguration")
      .endOr()
      .distinct

    // filter out enrolments that are over or not starting until tomorrow and pick the earliest (if any)
    results.filter(isInsideBounds(_, minutesToFuture)).minByOption(getStartTime)
