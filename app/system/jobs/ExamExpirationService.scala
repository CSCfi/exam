// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all._
import io.ebean.DB
import database.EbeanQueryExtensions
import models.assessment.ExamRecord
import models.exam.Exam
import org.joda.time.DateTime
import play.api.Logging
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.duration._

class ExamExpirationService @Inject() (private val configReader: ConfigReader)
    extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // Disassociate an exam from its creator, set state to deleted and erase any associated exam records
  private def cleanExamData(exam: Exam): Unit =
    exam.setState(Exam.State.DELETED)
    exam.setCreator(null)
    exam.update()
    DB.find(classOf[ExamRecord]).where.eq("exam", exam).list.foreach(_.delete)

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting exam expiration check ->")
      val exams = DB
        .find(classOf[Exam])
        .where
        .disjunction
        .eq("state", Exam.State.GRADED_LOGGED)
        .eq("state", Exam.State.ARCHIVED)
        .eq("state", Exam.State.ABORTED)
        .eq("state", Exam.State.REJECTED)
        .endJunction
        .list
      val now = DateTime.now
      exams
        .map(exam =>
          val expirationDate =
            if exam.getState eq Exam.State.ABORTED then exam.getExamParticipation.getEnded
            else exam.getGradedTime
          (exam, Option(expirationDate))
        )
        .foreach((exam, expiration) =>
          expiration match
            case Some(date) if configReader.getExamExpirationDate(date).isBeforeNow =>
              cleanExamData(exam)
              logger.info(s"Marked exam ${exam.getId} as expired")
            case None => logger.error(s"no grading time for exam ${exam.getId}")
            case _    => // nothing to do
        )
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (45.seconds, (60 * 24).minutes)
    val job: IO[Unit]     = runCheck().handleErrorWith(e => IO(logger.error("Error in exam expiration check", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
