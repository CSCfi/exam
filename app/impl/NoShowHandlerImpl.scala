// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import impl.mail.EmailComposer
import io.ebean.Model
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import play.api.Logging
import play.api.http.Status.OK
import play.api.libs.ws.WSClient
import play.mvc.Http

import java.net.URI
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters._

class NoShowHandlerImpl @Inject (
    private val composer: EmailComposer,
    private val wsClient: WSClient,
    private val configReader: ConfigReader,
    implicit val ec: ExecutionContext
) extends NoShowHandler
    with DbApiHelper
    with Logging:

  private def send[A <: Model](ref: String, item: A)(success: A => Unit) =
    val url = parseUrl(ref)
    wsClient
      .url(url.toString)
      .execute(Http.HttpVerbs.POST)
      .map(response =>
        if response.status != OK then logger.error(s"No success in sending no-show #$ref to XM")
        else
          success(item)
          item.update()
          logger.info(s"Successfully sent no-show #$ref to XM")
      )
      .recover(logger.error("Failed in sending no-shows back", _))

  private def parseUrl(reservationRef: String) =
    URI.create(s"${configReader.getIopHost}/api/enrolments/$reservationRef/noshow").toURL
  private def isLocal(ee: ExamEnrolment) =
    Option(ee.getExam).nonEmpty && ee.getExam.hasState(Exam.State.PUBLISHED, Exam.State.INITIALIZED)
  private def isCollaborative(ee: ExamEnrolment) =
    Option(ee.getCollaborativeExam).nonEmpty && Option(ee.getExam).isEmpty
  private def isNoShow(enrolment: ExamEnrolment) =
    (Option(enrolment.getReservation).nonEmpty && Option(enrolment.getReservation.getExternalRef).isEmpty) ||
      Option(enrolment.getExaminationEventConfiguration).nonEmpty

  override def handleNoShows(noShows: List[ExamEnrolment], reservations: List[Reservation]): Unit =
    val locals = noShows.filter(isNoShow).filter(ns => isLocal(ns) || isCollaborative(ns))
    locals.foreach(handleNoShowAndNotify)
    val externals = noShows.filter(ns =>
      val ref = Option(ns.getReservation).flatMap(r => Option(r.getExternalRef))
      ref.nonEmpty && !ns.getReservation.isSentAsNoShow &&
      (Option(ns.getUser).isEmpty || Option(ns.getExternalExam).flatMap(e => Option(e.getStarted)).isEmpty)
    )
    // Send to XM for further processing
    // NOTE: Possible performance bottleneck here. It is not impossible that there are a lot of unprocessed
    // no-shows and sending them one by one over network would be inefficient. However, this is not very likely.
    externals.foreach(ee => send(ee.getReservation.getExternalRef, ee)(_.setNoShow(true)))
    reservations.foreach(r => send(r.getExternalRef, r)(_.setSentAsNoShow(true)))

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
      (exam.getExamOwners.asScala ++ exam.getExamInspections.asScala.map(_.getUser)).foreach(teacher =>
        composer.composeNoShowMessage(teacher, enrolment.getUser, exam)
        logger.info(s"Email sent to ${teacher.getEmail}")
      )
