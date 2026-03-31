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
import play.api.Logging
import play.api.http.Status.OK
import play.api.libs.ws.WSClient
import play.mvc.Http
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.mail.EmailComposer

import java.net.URI
import java.time.Instant
import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class NoShowHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: BlockingIOExecutionContext
) extends NoShowHandler
    with EbeanQueryExtensions
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def sendEnrolmentNoShow(ee: ExamEnrolment): IO[Unit] =
    val ref = ee.reservation.externalRef
    logger.info(s"Sending no-show for enrolment with reservation $ref")
    IO.fromFuture(
      IO(
        wsClient
          .url(parseUrl(ref).toString)
          .execute(Http.HttpVerbs.POST)
          .map(response =>
            if response.status != OK then logger.error(s"No success in sending no-show #$ref to XM")
            else
              ee.noShow = true
              ee.update()
              logger.info(s"Successfully sent no-show #$ref to XM")
          )
          .recover { case e: Exception =>
            logger.error(s"Failed in sending no-show #$ref back", e)
          }
      )
    ).void

  private def sendReservationNoShow(r: Reservation): IO[Unit] =
    val ref = r.externalRef
    logger.info(s"Sending no-show for reservation $ref")
    IO.fromFuture(
      IO(
        wsClient
          .url(parseUrl(ref).toString)
          .execute(Http.HttpVerbs.POST)
          .map(response =>
            if response.status != OK then
              logger.error(s"No success in sending no-show reservation #$ref to XM")
            else
              r.sentAsNoShow = true
              r.update()
              logger.info(s"Successfully sent no-show reservation #$ref to XM")
          )
          .recover { case e: Exception =>
            logger.error(s"Failed in sending no-show reservation #$ref back", e)
          }
      )
    ).void

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
    newEnrolment.enrolledOn = Instant.now()
    newEnrolment.information = enrolment.information
    newEnrolment.setRandomDelay()
    newEnrolment.save()
