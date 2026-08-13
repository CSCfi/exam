// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.jobs

import cats.effect.{IO, Resource}
import cats.syntax.all.*
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.ExamRecord
import models.exam.Exam
import models.exam.ExamState
import org.joda.time.DateTime
import play.api.Logging
import services.config.ConfigReader

import javax.inject.Inject
import scala.concurrent.duration.*

class ExamExpirationService @Inject() (private val configReader: ConfigReader)
    extends ScheduledJob
    with Logging
    with EbeanQueryExtensions:

  // Disassociate an exam from its creator, set state to deleted and erase any associated exam records
  private def cleanExamData(exam: Exam): Unit =
    exam.state = ExamState.DELETED
    exam.creator = null
    exam.update()
    DB.find(classOf[ExamRecord]).where.eq("exam", exam).list.foreach(_.delete)

  private def runCheck(): IO[Unit] =
    IO.blocking {
      logger.info("Starting exam expiration check ->")
      val exams = DB
        .find(classOf[Exam])
        .where
        .disjunction
        .eq("state", ExamState.GRADED_LOGGED)
        .eq("state", ExamState.ARCHIVED)
        .eq("state", ExamState.ABORTED)
        .eq("state", ExamState.REJECTED)
        .endJunction
        .list
      val now = DateTime.now
      exams
        .map(exam =>
          val expirationDate =
            if exam.state `eq` ExamState.ABORTED then exam.examParticipation.ended
            else exam.gradedTime
          (exam, Option(expirationDate))
        )
        .foreach((exam, expiration) =>
          expiration match
            case Some(date) if configReader.getExamExpirationDate(date).isBeforeNow =>
              cleanExamData(exam)
              logger.info(s"Marked exam ${exam.id} as expired")
            case None => logger.error(s"no grading time for exam ${exam.id}")
            case _    => // nothing to do
        )
      logger.info("<- done")
    }

  def resource: Resource[IO, Unit] =
    val (delay, interval) = (45.seconds, (60 * 24).minutes)
    val job: IO[Unit] =
      runCheck().handleErrorWith(e => IO(logger.error("Error in exam expiration check", e)))
    val program: IO[Unit] = IO.sleep(delay) *> (job *> IO.sleep(interval)).foreverM
    Resource.make(program.start)(_.cancel).void
