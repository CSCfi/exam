// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import cats.effect.IO
import models.enrolment.Reservation
import play.api.Logging
import play.api.http.Status.NOT_FOUND
import play.api.libs.ws.WSClient
import services.config.ConfigReader

import java.net.{URI, URLEncoder}
import java.nio.charset.StandardCharsets
import javax.inject.Inject

/** Thrown when XM answers a retention call with anything but success or "not found". */
final class XmRequestFailed(url: String, status: Int)
    extends RuntimeException(s"XM answered $status to DELETE $url")

class XmRetentionClient @Inject() (wsClient: WSClient, configReader: ConfigReader)
    extends IopRetentionClient
    with Logging:

  private def segment(s: String) = URLEncoder.encode(s, StandardCharsets.UTF_8)

  // A document XM no longer has counts as deleted: an earlier run may have removed it before its
  // local transaction failed
  private def delete(url: String): IO[Unit] =
    IO.fromFuture(IO(wsClient.url(url).delete())).flatMap { response =>
      if response.status / 100 == 2 || response.status == NOT_FOUND then IO.unit
      else IO.raiseError(XmRequestFailed(url, response.status))
    }

  /** Uses XM's originator route, which deletes the reservation at the hosting organisation first
    * and then removes the XM document.
    */
  def deleteReservation(reservation: Reservation): IO[Unit] =
    Option(reservation.externalReservation) match
      case None =>
        IO.raiseError(IllegalStateException(s"Reservation ${reservation.id} has no external data"))
      case Some(external) =>
        val url = URI.create(
          s"${configReader.getIopHost}/api/organisations/${segment(external.orgRef)}" +
            s"/facilities/${segment(external.roomRef)}/reservations/${segment(reservation.externalRef)}"
        )
        delete(url.toString)

  def deleteAttachment(externalId: String): IO[Unit] =
    delete(
      URI.create(s"${configReader.getIopHost}/api/attachments/${segment(externalId)}").toString
    )
