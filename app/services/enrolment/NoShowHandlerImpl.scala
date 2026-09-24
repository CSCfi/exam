// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.enrolment

import cats.effect.IO
import cats.effect.syntax.all.concurrentParTraverseOps
import cats.effect.unsafe.implicits.global
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.ExamState
import org.joda.time.{DateTime, Period}
import play.api.Logging
import play.api.http.Status.OK
import play.api.libs.ws.WSClient
import play.mvc.Http
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.datetime.AppClock
import services.iop.{DeliveryDecision, DeliveryResult, IopDelivery}
import services.mail.EmailComposer

import java.net.URI
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

object NoShowHandlerImpl:
  /** A no-show XM still has not taken this long after the reservation ended is of no use to the
    * home organisation any more, so it is no longer sent.
    */
  val GiveUpAfter: Period = Period.days(30)

class NoShowHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    private val clock: AppClock,
    implicit val ec: BlockingIOExecutionContext
) extends NoShowHandler
    with EbeanQueryExtensions
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def sendEnrolmentNoShow(ee: ExamEnrolment): IO[Unit] =
    val ref = ee.reservation.externalRef
    logger.info(s"Sending no-show for enrolment with reservation $ref")
    // The student did not turn up either way, so the enrolment is marked also when giving up
    postNoShow(ref, ee.reservation.endAt) { () =>
      ee.noShow = true
      ee.update()
    }

  private def sendReservationNoShow(r: Reservation): IO[Unit] =
    val ref = r.externalRef
    logger.info(s"Sending no-show for reservation $ref")
    postNoShow(ref, r.endAt) { () =>
      r.sentAsNoShow = true
      r.update()
    }

  /** Sends a no-show to XM. `markDone` takes it out of the next checks once XM has it, or once
    * retrying cannot help (see [[IopDelivery]]). Other failures are retried on the next check.
    */
  private def postNoShow(ref: String, endAt: DateTime)(markDone: () => Unit): IO[Unit] =
    IO.fromFuture(IO(wsClient.url(parseUrl(ref).toString).execute(Http.HttpVerbs.POST)))
      .attempt
      .map {
        case Right(response) => IopDelivery.fromResponse(response, OK)
        case Left(e)         => DeliveryResult.Failed(e)
      }
      .flatMap(result =>
        IopDelivery.decide(result, Option(endAt), clock.now()) match
          case DeliveryDecision.Done =>
            IO.blocking(markDone()) *> IO(logger.info(s"Successfully sent no-show #$ref to XM"))
          case DeliveryDecision.GiveUp(reason) =>
            IO.blocking(markDone()) *> IO(
              logger.warn(s"Gave up sending no-show #$ref to XM: $reason")
            )
          case DeliveryDecision.RetryLater(reason) =>
            IO(logger.error(s"No success in sending no-show #$ref to XM ($reason), retrying later"))
      )

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/noshow").toURL
  private def isLocal(ee: ExamEnrolment) =
    Option(ee.exam).nonEmpty && ee.exam.hasState(ExamState.PUBLISHED, ExamState.INITIALIZED)
  private def isCollaborative(ee: ExamEnrolment) =
    Option(ee.collaborativeExam).nonEmpty && Option(ee.exam).isEmpty
  private def isNoShow(enrolment: ExamEnrolment) =
    (Option(enrolment.reservation).nonEmpty && Option(
      enrolment.reservation.externalRef
    ).isEmpty) ||
      Option(enrolment.examinationEventConfiguration).nonEmpty

  override def handleNoShows(noShows: List[ExamEnrolment], reservations: List[Reservation]): Unit =
    val locals = noShows.filter(isNoShow).filter(ns => isLocal(ns) || isCollaborative(ns))
    locals.foreach(handleNoShowAndNotify)
    val externals = noShows.filter(ns =>
      val ref = Option(ns.reservation).flatMap(r => Option(r.externalRef))
      ref.nonEmpty && !ns.reservation.sentAsNoShow &&
      (Option(ns.user).isEmpty || Option(ns.externalExam).flatMap(e =>
        Option(e.started)
      ).isEmpty)
    )

    // Process externals and reservations with bounded concurrency
    val io =
      (if externals.nonEmpty then
         val count = externals.size
         logger.info(s"Processing $count external no-shows with max concurrency of $maxConcurrency")
         externals
           .parTraverseN(maxConcurrency)(sendEnrolmentNoShow)
           .handleErrorWith(e => IO(logger.error("Error processing external no-shows", e)))
       else IO.unit)
      *>
        (if reservations.nonEmpty then
           val count = reservations.size
           logger.info(
             s"Processing $count reservation no-shows with max concurrency of $maxConcurrency"
           )
           reservations
             .parTraverseN(maxConcurrency)(sendReservationNoShow)
             .handleErrorWith(e => IO(logger.error("Error processing reservation no-shows", e)))
         else IO.unit)

    // Run the IO synchronously to maintain backward compatibility
    io.unsafeRunSync()

  override def handleNoShowAndNotify(enrolment: ExamEnrolment): Unit =
    val exam = enrolment.exam
    if Option(exam).exists(_.isPrivate) then
      // For no-shows with private examinations we automatically create a new enrolment so a student can re-reserve.
      createNewEnrolment(enrolment)
    enrolment.noShow = true
    enrolment.update()
    logger.info(s"Marked enrolment ${enrolment.id} as no-show")
    val (examName, courseCode) = Option(exam) match
      case None    => (enrolment.collaborativeExam.name, "")
      case Some(e) => (e.name, e.course.code)

    // Notify student
    composer.composeNoShowMessage(enrolment.user, examName, courseCode)
    if Option(exam).exists(_.isPrivate) then
      // Notify teachers
      (exam.examOwners.asScala ++ exam.examInspections.asScala.map(_.user)).foreach(teacher =>
        composer.composeNoShowMessage(teacher, enrolment.user, exam)
        logger.info(s"Email sent to ${teacher.email}")
      )

  private def createNewEnrolment(enrolment: ExamEnrolment) =
    val newEnrolment = new ExamEnrolment()
    if Option(enrolment.user).nonEmpty then
      newEnrolment.user = enrolment.user
    else
      newEnrolment.preEnrolledUserEmail = enrolment.preEnrolledUserEmail
    newEnrolment.exam = enrolment.exam
    newEnrolment.enrolledOn = DateTime.now()
    newEnrolment.information = enrolment.information
    newEnrolment.setRandomDelay()
    newEnrolment.save()
