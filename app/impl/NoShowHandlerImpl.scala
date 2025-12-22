// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import impl.mail.EmailComposer
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Sink, Source}
import play.api.Logging
import play.api.http.Status.OK
import play.api.libs.ws.WSClient
import play.mvc.Http

import java.net.URI
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class NoShowHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    private val actorSystem: ActorSystem,
    implicit val ec: ExecutionContext,
    implicit val mat: Materializer
) extends NoShowHandler
    with DbApiHelper
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def sendNoShow[T](ref: String, itemType: String, onSuccess: => Unit): Future[Unit] =
    logger.info(s"Sending no-show for $itemType $ref")
    wsClient
      .url(parseUrl(ref).toString)
      .execute(Http.HttpVerbs.POST)
      .map(response =>
        if response.status != OK then logger.error(s"No success in sending no-show $itemType #$ref to XM")
        else
          onSuccess
          logger.info(s"Successfully sent no-show $itemType #$ref to XM")
      )
      .recover { case e: Exception =>
        logger.error(s"Failed in sending no-show $itemType #$ref back", e)
      }

  private def sendEnrolmentNoShow(ee: ExamEnrolment): Future[Unit] =
    val ref = ee.getReservation.getExternalRef
    sendNoShow(
      ref,
      "enrolment with reservation", {
        ee.setNoShow(true)
        ee.update()
      }
    )

  private def sendReservationNoShow(r: Reservation): Future[Unit] =
    val ref = r.getExternalRef
    sendNoShow(
      ref,
      "reservation", {
        r.setSentAsNoShow(true)
        r.update()
      }
    )

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/noshow").toURL
  private def isLocal(ee: ExamEnrolment) =
    Option(ee.getExam).nonEmpty && ee.getExam.hasState(Exam.State.PUBLISHED, Exam.State.INITIALIZED)
  private def isCollaborative(ee: ExamEnrolment) =
    Option(ee.getCollaborativeExam).nonEmpty && Option(ee.getExam).isEmpty
  private def isNoShow(enrolment: ExamEnrolment) =
    (Option(enrolment.getReservation).nonEmpty && Option(enrolment.getReservation.getExternalRef).isEmpty) ||
      Option(enrolment.getExaminationEventConfiguration).nonEmpty

  private def runAsync[T](items: List[T], itemType: String, process: T => Future[Unit]): Future[Unit] =
    if items.nonEmpty then
      val count = items.size
      logger.info(s"Processing $count $itemType with max concurrency of $maxConcurrency")
      Source(items)
        .mapAsync(maxConcurrency)(process)
        .runWith(Sink.ignore)
        .map(_ => ())
        .recover { case e: Exception =>
          logger.error(s"Error processing $itemType", e)
        }
    else Future.successful(())

  override def handleNoShows(noShows: List[ExamEnrolment], reservations: List[Reservation]): Future[Unit] =
    // Process local no-shows synchronously (they affect database state that may be checked immediately)
    val locals = noShows.filter(isNoShow).filter(ns => isLocal(ns) || isCollaborative(ns))
    locals.foreach(handleNoShowAndNotify)

    // Process external no-shows asynchronously (they're just HTTP calls that can happen in the background)
    val externals = noShows.filter(ns =>
      val ref = Option(ns.getReservation).map(_.getExternalRef).nonNull
      ref.nonEmpty && !ns.getReservation.isSentAsNoShow &&
      (Option(ns.getUser).isEmpty || Option(ns.getExternalExam).map(_.getStarted).nonNull.isEmpty)
    )

    if externals.nonEmpty || reservations.nonEmpty then
      val externalsFuture    = runAsync(externals, "external no-shows", sendEnrolmentNoShow)
      val reservationsFuture = runAsync(reservations, "reservation no-shows", sendReservationNoShow)
      Future.sequence(Seq(externalsFuture, reservationsFuture)).map(_ => ())
    else Future.successful(())

  override def handleNoShowAndNotify(enrolment: ExamEnrolment): Unit =
    val exam = enrolment.getExam
    if Option(exam).exists(_.isPrivate) then
      // For no-shows with private examinations we remove the reservation so a student can re-reserve.
      // This is needed because a student is not able to re-enroll by themselves.
      val reservation = enrolment.getReservation
      val eec         = enrolment.getExaminationEventConfiguration
      enrolment.setReservation(null)
      enrolment.setExaminationEventConfiguration(null)
      enrolment.setNoShow(false)
      enrolment.update()
      if Option(reservation).nonEmpty then reservation.delete
      if Option(eec).nonEmpty then eec.delete
    else enrolment.setNoShow(true)
    enrolment.update()
    logger.info(s"Marked enrolment ${enrolment.getId} as no-show")
    val (examName, courseCode) = Option(exam) match
      case None    => (enrolment.getCollaborativeExam.getName, "")
      case Some(e) => (e.getName, e.getCourse.getCode)

    // Schedule email sending asynchronously to avoid blocking
    actorSystem.scheduler.scheduleOnce(
      1.second,
      () => {
        // Notify student
        composer.composeNoShowMessage(enrolment.getUser, examName, courseCode)
        if Option(exam).exists(_.isPrivate) then
          // Notify teachers
          (exam.getExamOwners.asScala ++ exam.getExamInspections.asScala.map(_.getUser)).foreach(teacher =>
            composer.composeNoShowMessage(teacher, enrolment.getUser, exam)
            logger.info(s"Email sent to ${teacher.getEmail}")
          )
      }
    )
