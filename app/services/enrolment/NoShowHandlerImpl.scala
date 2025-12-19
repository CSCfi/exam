// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.enrolment

import cats.effect.IO
import cats.effect.syntax.all.concurrentParTraverseOps
import cats.effect.unsafe.implicits.global
import cats.syntax.all._
import io.ebean.Model
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import play.api.Logging
import play.api.http.Status.OK
import play.api.libs.ws.WSClient
import play.mvc.Http
import services.config.ConfigReader
import services.mail.EmailComposer

import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class NoShowHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: ExecutionContext
) extends NoShowHandler
    with EbeanQueryExtensions
    with Logging:

  // Maximum number of concurrent HTTP requests
  private val maxConcurrency = 10

  private def sendEnrolmentNoShow(ee: ExamEnrolment): IO[Unit] =
    val ref = ee.getReservation.getExternalRef
    logger.info(s"Sending no-show for enrolment with reservation $ref")
    IO.fromFuture(
      IO(
        wsClient
          .url(parseUrl(ref).toString)
          .execute(Http.HttpVerbs.POST)
          .map(response =>
            if response.status != OK then logger.error(s"No success in sending no-show #$ref to XM")
            else
              ee.setNoShow(true)
              ee.update()
              logger.info(s"Successfully sent no-show #$ref to XM")
          )
          .recover { case e: Exception =>
            logger.error(s"Failed in sending no-show #$ref back", e)
          }
      )
    ).void

  private def sendReservationNoShow(r: Reservation): IO[Unit] =
    val ref = r.getExternalRef
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
              r.setSentAsNoShow(true)
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
    Option(ee.getExam).nonEmpty && ee.getExam.hasState(Exam.State.PUBLISHED, Exam.State.INITIALIZED)
  private def isCollaborative(ee: ExamEnrolment) =
    Option(ee.getCollaborativeExam).nonEmpty && Option(ee.getExam).isEmpty
  private def isNoShow(enrolment: ExamEnrolment) =
    (Option(enrolment.getReservation).nonEmpty && Option(
      enrolment.getReservation.getExternalRef
    ).isEmpty) ||
      Option(enrolment.getExaminationEventConfiguration).nonEmpty

  override def handleNoShows(noShows: List[ExamEnrolment], reservations: List[Reservation]): Unit =
    val locals = noShows.filter(isNoShow).filter(ns => isLocal(ns) || isCollaborative(ns))
    locals.foreach(handleNoShowAndNotify)
    val externals = noShows.filter(ns =>
      val ref = Option(ns.getReservation).flatMap(r => Option(r.getExternalRef))
      ref.nonEmpty && !ns.getReservation.isSentAsNoShow &&
      (Option(ns.getUser).isEmpty || Option(ns.getExternalExam).flatMap(e =>
        Option(e.getStarted)
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

    // Notify student
    composer.composeNoShowMessage(enrolment.getUser, examName, courseCode)
    if Option(exam).exists(_.isPrivate) then
      // Notify teachers
      (exam.getExamOwners.asScala ++ exam.getExamInspections.asScala.map(_.getUser)).foreach(
        teacher =>
          composer.composeNoShowMessage(teacher, enrolment.getUser, exam)
          logger.info(s"Email sent to ${teacher.getEmail}")
      )
