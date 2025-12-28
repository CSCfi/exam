// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.user.User
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.Logging
import play.api.http.Status
import play.api.libs.json.{JsValue, Json}
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.{CalendarHandler, DateTimeHandler}
import services.enrolment.EnrolmentHandler

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.{Failure, Success, Try}

/** Service for external calendar operations for collaborative exams
  *
  * Handles external reservation requests and slot queries.
  */
class CollaborativeExternalCalendarService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    calendarHandler: CalendarHandler,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    wsClient: WSClient,
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with Logging
    with JsonBodyWritables:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Check enrolment validity for external reservation
    *
    * @param enrolment
    *   the enrolment
    * @param exam
    *   the exam
    * @param user
    *   the user
    * @return
    *   Some(error message) if invalid, None if valid
    */
  private def checkEnrolmentForExternalReservation(
      enrolment: ExamEnrolment,
      exam: Exam,
      user: User
  ): Option[String] =
    val oldReservation = enrolment.getReservation
    if exam.getState == Exam.State.STUDENT_STARTED ||
      (oldReservation != null && oldReservation.toInterval.isBefore(DateTime.now()))
    then Some("i18n_reservation_in_effect")
    else if oldReservation == null && !enrolmentHandler.isAllowedToParticipate(exam, user) then
      Some("i18n_no_trials_left")
    else None

  /** Find enrolment for external reservation
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @param now
    *   current time
    * @return
    *   Future containing Some(ExamEnrolment) if found, None otherwise
    */
  private def findEnrolmentForExternalReservation(
      examId: Long,
      userId: Long,
      now: DateTime
  ): Future[Option[ExamEnrolment]] =
    Future(
      DB.find(classOf[ExamEnrolment])
        .fetch("reservation")
        .where()
        .eq("user.id", userId)
        .eq("collaborativeExam.id", examId)
        .disjunction()
        .isNull("reservation")
        .gt("reservation.startAt", now.toDate)
        .endJunction()
        .find
    )(using ec)

  private def handleReservationRequest(
      enrolment: ExamEnrolment,
      exam: Exam,
      user: User,
      url: java.net.URL,
      requestBody: JsValue,
      start: DateTime,
      end: DateTime,
      orgRef: String,
      roomRef: String,
      sectionIds: Seq[Long]
  ): Future[Either[String, JsValue]] =
    checkEnrolmentForExternalReservation(enrolment, exam, user) match
      case Some(error) =>
        Future.successful(Left(error)).asInstanceOf[Future[Either[String, JsValue]]]
      case None =>
        makeExternalReservationRequest(
          url,
          requestBody,
          enrolment,
          exam,
          start,
          end,
          user,
          orgRef,
          roomRef,
          sectionIds
        )

  private def makeExternalReservationRequest(
      url: java.net.URL,
      requestBody: JsValue,
      enrolment: ExamEnrolment,
      exam: Exam,
      start: DateTime,
      end: DateTime,
      user: User,
      orgRef: String,
      roomRef: String,
      sectionIds: Seq[Long]
  ): Future[Either[String, JsValue]] =
    wsClient
      .url(url.toString)
      .post(requestBody)
      .flatMap { response =>
        val root = response.json
        if response.status != Status.CREATED then
          Future.successful(
            Left(
              (root \ "message").asOpt[String].getOrElse("Connection refused")
            )
          )
        else
          calendarHandler
            .handleExternalReservation(
              enrolment,
              exam,
              root,
              start,
              end,
              user,
              orgRef,
              roomRef,
              sectionIds
            )
            .map { err =>
              if err.isEmpty then Right((root \ "id").as[JsValue])
              else Left("Failed to handle external reservation")
            }
      }

  /** Handle external reservation request
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @param orgRef
    *   organisation reference
    * @param roomRef
    *   room reference
    * @param start
    *   reservation start
    * @param end
    *   reservation end
    * @param sectionIds
    *   optional section IDs
    * @param requestBody
    *   JSON body for the external request
    * @param url
    *   the external URL to call
    * @return
    *   Future containing Either[error message, JsValue with reservation ID]
    */
  def requestExternalReservation(
      examId: Long,
      userId: Long,
      orgRef: String,
      roomRef: String,
      start: DateTime,
      end: DateTime,
      sectionIds: Seq[Long],
      requestBody: JsValue,
      url: java.net.URL
  ): Future[Either[String, JsValue]] =
    val now = dateTimeHandler.adjustDST(DateTime.now())

    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      enrolmentOpt <- findEnrolmentForExternalReservation(examId, userId, now)
      enrolment <- enrolmentOpt match
        case None    => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(e) => Future.successful(e)
      examOpt <- examLoader.downloadExam(ce)
      exam <- examOpt match
        case None    => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(e) => Future.successful(e)
    yield (enrolment, exam)).flatMap { (enrolment, exam) =>
      val user = enrolment.getUser
      handleReservationRequest(
        enrolment,
        exam,
        user,
        url,
        requestBody,
        start,
        end,
        orgRef,
        roomRef,
        sectionIds
      )
    }.recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }

  private def handleSlotsRequest(
      exam: Exam,
      orgRef: String,
      roomRef: String,
      date: String,
      userId: Long
  ): Future[Either[String, JsValue]] =
    val result: Future[Either[String, JsValue]] = if !exam.hasState(Exam.State.PUBLISHED) then
      Future.successful(Left("i18n_error_exam_not_found"))
    else
      // Validate date and build URL
      calendarHandler.parseSearchDate(date, exam, null) match
        case None =>
          Future.successful(Left("Invalid date"))
        case Some(_) =>
          // Build URL
          val start =
            ISODateTimeFormat.dateTime().print(new org.joda.time.DateTime(exam.getPeriodStart))
          val end =
            ISODateTimeFormat.dateTime().print(new org.joda.time.DateTime(exam.getPeriodEnd))
          val duration = exam.getDuration

          Try(parseUrl(orgRef, roomRef, date, start, end, duration)) match
            case Failure(e) =>
              logger.error("Failed to parse URL for slots", e)
              Future.successful(Left("Failed to parse URL"))
            case Success(url) =>
              makeExternalSlotsRequest(url, date, exam, userId)
    result

  private def makeExternalSlotsRequest(
      url: java.net.URL,
      date: String,
      exam: Exam,
      userId: Long
  ): Future[Either[String, JsValue]] =
    val wsRequest = wsClient
      .url(url.toString.split("\\?")(0))
      .withQueryStringParameters(
        url.getQuery.split("&").map { param =>
          val parts = param.split("=")
          parts(0) -> parts(1)
        }*
      )

    wsRequest.get().map { response =>
      val root = response.json
      if response.status != Status.OK then
        Left(
          (root \ "message").asOpt[String].getOrElse("Connection refused")
        )
      else
        val user  = DB.find(classOf[User], userId)
        val slots = calendarHandler.postProcessSlots(root, date, exam, user)
        Right(Json.toJson(slots.toSeq))
    }

  /** Get slots from external system
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @param orgRef
    *   organisation reference
    * @param roomRef
    *   room reference
    * @param date
    *   date string
    * @return
    *   Future containing Either[error message, JsValue with slots]
    */
  def requestExternalSlots(
      examId: Long,
      userId: Long,
      orgRef: String,
      roomRef: String,
      date: String
  ): Future[Either[String, JsValue]] =
    val now = dateTimeHandler.adjustDST(DateTime.now())

    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      enrolmentOpt <- findEnrolmentForExternalReservation(examId, userId, now)
      _ <- enrolmentOpt match
        case None => Future.failed(new IllegalArgumentException("i18n_error_enrolment_not_found"))
        case Some(_) => Future.successful(())
      examOpt <- examLoader.downloadExam(ce)
      exam <- examOpt match
        case None    => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(e) => Future.successful(e)
    yield exam).flatMap { exam =>
      handleSlotsRequest(exam, orgRef, roomRef, date, userId)
    }.recoverWith { case e: IllegalArgumentException => Future.successful(Left(e.getMessage)) }

  /** Find enrolled exam for a user
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @return
    *   Future containing Some(ExamEnrolment) if found, None otherwise
    */
  def findEnrolledExam(examId: Long, userId: Long): Future[Option[ExamEnrolment]] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    Future(
      DB.find(classOf[ExamEnrolment])
        .where()
        .eq("user", DB.find(classOf[User], userId))
        .eq("collaborativeExam.id", examId)
        .disjunction()
        .isNull("reservation")
        .gt("reservation.startAt", now.toDate)
        .endJunction()
        .find
    )(using ec)

  private def parseUrl(
      orgRef: String,
      facilityRef: String,
      date: String,
      start: String,
      end: String,
      duration: Int
  ): URL =
    val url =
      configReader.getIopHost +
        f"/api/organisations/$orgRef/facilities/$facilityRef/slots" +
        f"?date=$date&startAt=$start&endAt=$end&duration=$duration"
    URI.create(url).toURL
