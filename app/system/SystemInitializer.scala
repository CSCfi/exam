// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.config.ConfigReader
import models.user.User
import org.apache.pekko.actor.{ActorRef, ActorSystem, Cancellable}
import org.joda.time.{DateTime, DateTimeConstants, DateTimeZone, Seconds}
import play.api.inject.ApplicationLifecycle
import play.api.{Environment, Logging, Mode}
import repository.DatabaseExecutionContext

import java.nio.charset.Charset
import java.util.concurrent.TimeUnit
import javax.inject.{Inject, Named, Singleton}
import scala.concurrent.Future
import scala.concurrent.duration.Duration
import scala.jdk.CollectionConverters.*
import scala.util.control.Exception.catching

@Singleton
class SystemInitializer @Inject() (
    private val system: ActorSystem,
    private val lifecycle: ApplicationLifecycle,
    private val composer: EmailComposer,
    private val configReader: ConfigReader,
    private val env: Environment,
    @Named("exam-auto-saver-actor") examAutoSaver: ActorRef,
    @Named("reservation-checker-actor") reservationChecker: ActorRef,
    @Named("auto-evaluation-notifier-actor") autoEvaluationNotifier: ActorRef,
    @Named("exam-expiration-actor") examExpirationChecker: ActorRef,
    @Named("assessment-transfer-actor") assessmentTransferrer: ActorRef,
    @Named("collaborative-assessment-sender-actor") collaborativeAssessmentSender: ActorRef,
    @Named("reservation-reminder-actor") reservationReminder: ActorRef,
    @Named("external-exam-expiration-actor") externalExamExpirationChecker: ActorRef,
    implicit val ec: DatabaseExecutionContext
) extends Logging:
  Charset.defaultCharset.displayName match
    case "UTF-8" =>
    case encoding =>
      logger.warn(
        s"Default encoding is other than UTF-8 ($encoding). This might cause problems with non-ASCII character handling!"
      )
  DateTimeZone.setDefault(DateTimeZone.forID("UTC"))
  private val tasks: Seq[Cancellable] = env.mode match
    case Mode.Test => Seq.empty
    case _ =>
      Seq(
        schedule(examAutoSaver, 15, 1),
        schedule(reservationChecker, 30, 60),
        schedule(autoEvaluationNotifier, 60, 15),
        schedule(examExpirationChecker, 45, 60 * 24),
        schedule(assessmentTransferrer, 70, 60),
        schedule(collaborativeAssessmentSender, 80, 15),
        schedule(reservationReminder, 90, 10),
        schedule(externalExamExpirationChecker, 100, 60 * 24)
      )
  private var reporter: Option[Cancellable] = None

  scheduleWeeklyReport()
  lifecycle.addStopHook { () =>
    logger.info("running shutdown hooks")
    tasks.foreach(_.cancel())
    if reporter.nonEmpty then reporter.get.cancel()
    Future.successful(())
  }

  private def schedule(actor: ActorRef, delay: Int, interval: Int): Cancellable =
    system.scheduler.scheduleAtFixedRate(
      Duration.create(delay, TimeUnit.SECONDS),
      Duration.create(interval, TimeUnit.MINUTES),
      actor,
      "tick"
    )

  private def scheduleWeeklyReport(): Unit =
    val delay = Duration.create(secondsUntilNextMondayRun(), TimeUnit.SECONDS)
    if reporter.nonEmpty then reporter.get.cancel()
    val newTask = system.scheduler.scheduleOnce(
      delay,
      () => {
        logger.info("Running weekly email report")
        DB.find(classOf[User])
          .fetch("language")
          .where
          .eq("roles.name", "TEACHER")
          .findList
          .asScala
          .foreach(u =>
            catching(classOf[RuntimeException]).either(composer.composeWeeklySummary(u)) match
              case Left(e) => logger.error(s"Failed to send email for ${u.getEmail}", e)
              case _       => // All good
          )
        scheduleWeeklyReport() // Reschedule
      }
    )
    reporter = Some(newTask)

  private def secondsUntilNextMondayRun() =
    val now             = DateTime.now
    val defaultTimeZone = configReader.getDefaultTimeZone
    // Every Monday at 5AM UTC
    val adjustedHours = if defaultTimeZone.isStandardOffset(now.getMillis) then 5 else 4
    val normalNextRun = now
      .withHourOfDay(adjustedHours)
      .withMinuteOfHour(0)
      .withSecondOfMinute(0)
      .withMillisOfSecond(0)
      .plusWeeks(
        if (now.getDayOfWeek == DateTimeConstants.MONDAY) 0
        else 1
      )
      .withDayOfWeek(DateTimeConstants.MONDAY)
    // If it's a Monday after scheduled run time -> postpone
    val postponedRun = if !normalNextRun.isAfter(now) then normalNextRun.plusWeeks(1) else normalNextRun
    val nextRun =
      // Case for: now there's no DST in effect, but by the next run there will be.
      if adjustedHours == 5 && !defaultTimeZone.isStandardOffset(postponedRun.getMillis) then postponedRun.minusHours(1)
      // Case for: now there's DST in effect, but by the next run there won't be
      else if adjustedHours != 5 && defaultTimeZone.isStandardOffset(postponedRun.getMillis) then
        postponedRun.plusHours(1)
      else postponedRun
    logger.info(s"Scheduled next weekly report to be run at $nextRun")
    // Increase delay with one second so that this won't fire off before the intended time. This may happen because of
    // millisecond-level rounding issues and possibly cause resending of messages.
    Seconds.secondsBetween(now, nextRun).getSeconds + 1
