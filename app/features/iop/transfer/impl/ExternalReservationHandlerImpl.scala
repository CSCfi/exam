// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.impl

import features.iop.transfer.api.ExternalReservationHandler
import io.ebean.DB
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, Reservation}
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import play.api.http.Status._
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc.Result
import play.api.mvc.Results._
import services.config.ConfigReader
import services.datetime.DateTimeHandler
import services.mail.EmailComposer

import java.net.{MalformedURLException, URI}
import javax.inject.Inject
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}

class ExternalReservationHandlerImpl @Inject() (
    wsClient: WSClient,
    emailComposer: EmailComposer,
    dateTimeHandler: DateTimeHandler,
    configReader: ConfigReader
)(implicit ec: ExecutionContext)
    extends ExternalReservationHandler
    with EbeanQueryExtensions
    with JsonBodyWritables
    with Logging:

  private def parseUrl(orgRef: String, facilityRef: String, reservationRef: Option[String]): URI =
    val sb = new StringBuilder(configReader.getIopHost)
    sb.append(s"/api/organisations/$orgRef/facilities/$facilityRef/reservations")
    reservationRef.foreach(ref => sb.append(s"/$ref"))
    URI.create(sb.toString)

  override def removeExternalReservation(reservation: Reservation): Future[Option[Int]] =
    val external = reservation.getExternalReservation
    try
      val url = parseUrl(external.getOrgRef, external.getRoomRef, Some(reservation.getExternalRef))
      wsClient
        .url(url.toString)
        .delete()
        .map { response =>
          if response.status != OK then Some(INTERNAL_SERVER_ERROR)
          else None
        }
        .recover { case _ =>
          Some(INTERNAL_SERVER_ERROR)
        }
    catch
      case _: MalformedURLException =>
        Future.successful(Some(INTERNAL_SERVER_ERROR))

  private def requestRemoval(ref: String, user: User, msg: String): Future[Result] =
    val enrolmentOpt =
      DB.find(classOf[ExamEnrolment])
        .fetch("reservation")
        .fetch("reservation.machine")
        .fetch("reservation.machine.room")
        .where()
        .eq("user.id", user.getId)
        .eq("reservation.externalRef", ref)
        .find

    enrolmentOpt match
      case None =>
        Future.successful(NotFound(s"No reservation with ref $ref for current user."))
      case Some(enrolment) =>
        // Removal is not permitted if the reservation is in the past or ongoing
        val reservation = enrolment.getReservation
        val now         = dateTimeHandler.adjustDST(DateTime.now(), reservation.getExternalReservation)

        if reservation.toInterval.isBefore(now) || reservation.toInterval.contains(now) then
          Future.successful(Forbidden("i18n_reservation_in_effect"))
        else
          // good to go
          val external = reservation.getExternalReservation
          try
            val url = parseUrl(external.getOrgRef, external.getRoomRef, Some(ref))
            wsClient
              .url(url.toString)
              .delete()
              .map { response =>
                if response.status != OK then
                  val msg = (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                  InternalServerError(msg)
                else
                  enrolment.setReservation(null)
                  enrolment.setReservationCanceled(true)
                  DB.save(enrolment)
                  reservation.delete()

                  // send email asynchronously
                  val isStudentUser = user == enrolment.getUser
                  emailComposer.scheduleEmail(1.second) {
                    emailComposer.composeReservationCancellationNotification(
                      enrolment.getUser,
                      reservation,
                      Some(msg),
                      isStudentUser,
                      enrolment
                    )
                    logger.info("Reservation cancellation confirmation email sent")
                  }

                  Ok
              }
          catch
            case e: MalformedURLException =>
              Future.successful(InternalServerError(e.getMessage))

  // remove reservation on the external side, initiated by the reservation holder
  override def removeReservation(reservation: Reservation, user: User, msg: String): Future[Result] =
    if Option(reservation.getExternalReservation).isEmpty then Future.successful(Ok)
    else requestRemoval(reservation.getExternalRef, user, msg)
