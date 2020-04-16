/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.system;

import akka.actor.ActorRef;
import akka.actor.ActorSystem;
import akka.actor.Cancellable;
import backend.impl.EmailComposer;
import backend.models.User;
import backend.repository.DatabaseExecutionContext;
import backend.util.config.ConfigReader;
import io.ebean.Ebean;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import javax.inject.Named;
import javax.inject.Singleton;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;
import org.joda.time.DateTimeZone;
import org.joda.time.Seconds;
import play.Logger;
import play.inject.ApplicationLifecycle;
import scala.concurrent.duration.Duration;
import scala.concurrent.duration.FiniteDuration;

@Singleton
class SystemInitializer {
  private static final int EXAM_AUTO_SAVER_START_AFTER_SECONDS = 15;
  private static final int EXAM_AUTO_SAVER_INTERVAL_MINUTES = 1;
  private static final int RESERVATION_POLLER_START_AFTER_SECONDS = 30;
  private static final int RESERVATION_POLLER_INTERVAL_HOURS = 1;
  private static final int EXAM_EXPIRY_POLLER_START_AFTER_SECONDS = 45;
  private static final int EXAM_EXPIRY_POLLER_INTERVAL_DAYS = 1;
  private static final int AUTO_EVALUATION_NOTIFIER_START_AFTER_SECONDS = 60;
  private static final int AUTO_EVALUATION_NOTIFIER_INTERVAL_MINUTES = 15;
  private static final int ASSESSMENT_TRANSFER_START_AFTER_SECONDS = 70;
  private static final int ASSESSMENT_TRANSFER_INTERVAL_HOURS = 1;
  private static final int COLLABORATIVE_ASSESSMENT_SENDER_START_AFTER_SECONDS = 80;
  private static final int COLLABORATIVE_ASSESSMENT_SENDER_INTERVAL_MINUTES = 15;
  private static final int RESERVATION_REMINDER_START_AFTER_SECONDS = 90;
  private static final int RESERVATION_REMINDER_INTERVAL_MINUTES = 10;

  private static final Logger.ALogger logger = Logger.of(SystemInitializer.class);

  private final EmailComposer composer;
  private final ActorSystem system;
  private final DatabaseExecutionContext ec;

  private final Map<String, Cancellable> tasks = new HashMap<>();
  private final DateTimeZone defaultTimeZone;

  @Inject
  SystemInitializer(
    ActorSystem system,
    ApplicationLifecycle lifecycle,
    EmailComposer composer,
    ConfigReader configReader,
    DatabaseExecutionContext ec,
    @Named("exam-auto-saver-actor") ActorRef examAutoSaver,
    @Named("reservation-checker-actor") ActorRef reservationChecker,
    @Named("auto-evaluation-notifier-actor") ActorRef autoEvaluationNotifier,
    @Named("exam-expiration-actor") ActorRef examExpirationChecker,
    @Named("assessment-transfer-actor") ActorRef assessmentTransferrer,
    @Named("collaborative-assessment-sender-actor") ActorRef collaborativeAssessmentSender,
    @Named("reservation-reminder-actor") ActorRef reservationReminder
  ) {
    this.system = system;
    this.composer = composer;
    this.ec = ec;
    this.defaultTimeZone = configReader.getDefaultTimeZone();

    String encoding = System.getProperty("file.encoding");
    if (!encoding.equals("UTF-8")) {
      logger.warn(
        "Default encoding is other than UTF-8 ({}). " + "This might cause problems with non-ASCII character handling!",
        encoding
      );
    }

    System.setProperty("user.timezone", "UTC");
    TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    DateTimeZone.setDefault(DateTimeZone.forID("UTC"));

    tasks.put(
      "AUTO_SAVER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(EXAM_AUTO_SAVER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(EXAM_AUTO_SAVER_INTERVAL_MINUTES, TimeUnit.MINUTES),
          examAutoSaver,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "RESERVATION_POLLER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(RESERVATION_POLLER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(RESERVATION_POLLER_INTERVAL_HOURS, TimeUnit.HOURS),
          reservationChecker,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "EXPIRY_POLLER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(EXAM_EXPIRY_POLLER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(EXAM_EXPIRY_POLLER_INTERVAL_DAYS, TimeUnit.DAYS),
          examExpirationChecker,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "AUTOEVALUATION_NOTIFIER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(AUTO_EVALUATION_NOTIFIER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(AUTO_EVALUATION_NOTIFIER_INTERVAL_MINUTES, TimeUnit.MINUTES),
          autoEvaluationNotifier,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "EXTERNAL_EXAM_SENDER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(ASSESSMENT_TRANSFER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(ASSESSMENT_TRANSFER_INTERVAL_HOURS, TimeUnit.HOURS),
          assessmentTransferrer,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "COLLABORATIVE_EXAM_SENDER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(COLLABORATIVE_ASSESSMENT_SENDER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(COLLABORATIVE_ASSESSMENT_SENDER_INTERVAL_MINUTES, TimeUnit.MINUTES),
          collaborativeAssessmentSender,
          "tick",
          ec,
          null
        )
    );
    tasks.put(
      "RESERVATION_REMINDER",
      system
        .scheduler()
        .scheduleAtFixedRate(
          Duration.create(RESERVATION_REMINDER_START_AFTER_SECONDS, TimeUnit.SECONDS),
          Duration.create(RESERVATION_REMINDER_INTERVAL_MINUTES, TimeUnit.MINUTES),
          reservationReminder,
          "tick",
          ec,
          null
        )
    );

    scheduleWeeklyReport();

    lifecycle.addStopHook(
      () -> {
        cancelTasks();
        return CompletableFuture.completedFuture(null);
      }
    );
  }

  private int secondsUntilNextMondayRun() {
    DateTime now = DateTime.now();
    // Every Monday at 5AM UTC
    int adjustedHours = 5;
    if (!defaultTimeZone.isStandardOffset(now.getMillis())) {
      // Have the run happen an hour earlier to take care of DST offset
      adjustedHours -= 1;
    }

    DateTime nextRun = now
      .withHourOfDay(adjustedHours)
      .withMinuteOfHour(0)
      .withSecondOfMinute(0)
      .withMillisOfSecond(0)
      .plusWeeks(now.getDayOfWeek() == DateTimeConstants.MONDAY ? 0 : 1)
      .withDayOfWeek(DateTimeConstants.MONDAY);
    if (!nextRun.isAfter(now)) {
      nextRun = nextRun.plusWeeks(1); // now is a Monday after scheduled run time -> postpone
    }
    // Case for: now there's no DST but by next run there will be.
    if (adjustedHours == 5 && !defaultTimeZone.isStandardOffset(nextRun.getMillis())) {
      nextRun = nextRun.minusHours(1);
    }
    // Case for: now there's DST but by next run there won't be
    else if (adjustedHours != 5 && defaultTimeZone.isStandardOffset(nextRun.getMillis())) {
      nextRun = nextRun.plusHours(1);
    }

    logger.info("Scheduled next weekly report to be run at {}", nextRun.toString());
    // Increase delay with one second so that this won't fire off before intended time. This may happen because of
    // millisecond-level rounding issues and possibly cause resending of messages.
    return Seconds.secondsBetween(now, nextRun).getSeconds() + 1;
  }

  private void scheduleWeeklyReport() {
    FiniteDuration delay = FiniteDuration.create(secondsUntilNextMondayRun(), TimeUnit.SECONDS);
    Cancellable reportTask = tasks.remove("REPORT_SENDER");
    if (reportTask != null) {
      reportTask.cancel();
    }
    tasks.put(
      "REPORT_SENDER",
      system
        .scheduler()
        .scheduleOnce(
          delay,
          () -> {
            logger.info("Running weekly email report");
            List<User> teachers = Ebean
              .find(User.class)
              .fetch("language")
              .where()
              .eq("roles.name", "TEACHER")
              .findList();
            teachers.forEach(
              t -> {
                try {
                  composer.composeWeeklySummary(t);
                } catch (RuntimeException e) {
                  logger.error("Failed to send email for {}", t.getEmail());
                }
              }
            );
            // Reschedule
            scheduleWeeklyReport();
          },
          ec
        )
    );
  }

  private void cancelTasks() {
    tasks.values().forEach(Cancellable::cancel);
  }
}
