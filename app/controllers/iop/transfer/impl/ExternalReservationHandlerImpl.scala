// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.iop.transfer.api.ExternalReservationHandler
import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import models.enrolment.{ExamEnrolment, Reservation}
import models.user.User
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.http.Status.*
import play.api.libs.ws.{JsonBodyWritables, WSClient}
import play.api.mvc.Result
import play.api.mvc.Results.*

import java.net.{MalformedURLException, URI}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration.*

class ExternalReservationHandlerImpl @Inject() (
    wsClient: WSClient,
    system: ActorSystem,
    emailComposer: EmailComposer,
    dateTimeHandler: DateTimeHandler,
    configReader: ConfigReader
)(implicit ec: ExecutionContext)
    extends ExternalReservationHandler
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
    val enrolmentOpt = Option(
      DB.find(classOf[ExamEnrolment])
        .fetch("reservation")
        .fetch("reservation.machine")
        .fetch("reservation.machine.room")
        .where()
        .eq("user.id", user.getId)
        .eq("reservation.externalRef", ref)
        .findOne()
    )

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
                  system.scheduler.scheduleOnce(1.second) {
                    emailComposer.composeReservationCancellationNotification(
                      enrolment.getUser,
                      reservation,
                      Some(msg),
                      isStudentUser,
                      enrolment
                    )
                    logger.info("Reservation cancellation confirmation email sent")
                  }(using system.dispatcher)

                  Ok
              }
          catch
            case e: MalformedURLException =>
              Future.successful(InternalServerError(e.getMessage))

  // remove reservation on the external side, initiated by the reservation holder
  override def removeReservation(reservation: Reservation, user: User, msg: String): Future[Result] =
    if Option(reservation.getExternalReservation).isEmpty then Future.successful(Ok)
    else requestRemoval(reservation.getExternalRef, user, msg)
