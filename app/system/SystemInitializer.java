package system;


import akka.actor.ActorSystem;
import akka.actor.Cancellable;
import com.avaje.ebean.Ebean;
import models.User;
import net.sf.ehcache.CacheManager;
import org.joda.time.DateTime;
import org.joda.time.DateTimeConstants;
import org.joda.time.DateTimeZone;
import org.joda.time.Seconds;
import play.Logger;
import play.db.Database;
import play.inject.ApplicationLifecycle;
import scala.concurrent.duration.Duration;
import scala.concurrent.duration.FiniteDuration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import javax.inject.Singleton;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

@Singleton
public class SystemInitializer {

    public static final int EXAM_AUTO_SAVER_START_AFTER_SECONDS = 15;
    public static final int EXAM_AUTO_SAVER_INTERVAL_MINUTES = 1;
    public static final int RESERVATION_POLLER_START_AFTER_SECONDS = 30;
    public static final int RESERVATION_POLLER_INTERVAL_HOURS = 1;
    public static final int EXAM_EXPIRY_POLLER_START_AFTER_SECONDS = 45;
    public static final int EXAM_EXPIRY_POLLER_INTERVAL_DAYS = 1;
    public static final int AUTO_EVALUATION_NOTIFIER_START_AFTER_SECONDS = 60;
    public static final int AUTO_EVALUATION_NOTIFIER_INTERVAL_MINUTES = 15;


    protected ApplicationLifecycle lifecycle;
    protected EmailComposer composer;
    protected ActorSystem actor;
    protected Database database;

    private Map<String, Cancellable> tasks = new HashMap<>();

    @Inject
    public SystemInitializer(ActorSystem actor, ApplicationLifecycle lifecycle, EmailComposer composer, Database database) {
        this.actor = actor;
        this.lifecycle = lifecycle;
        this.composer = composer;
        this.database = database;

        String encoding = System.getProperty("file.encoding");
        if (!encoding.equals("UTF-8")) {
            Logger.warn("Default encoding is other than UTF-8 ({}). " +
                    "This might cause problems with non-ASCII character handling!", encoding);
        }

        System.setProperty("user.timezone", "UTC");
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
        DateTimeZone.setDefault(DateTimeZone.forID("UTC"));

        tasks.put("AUTO_SAVER", actor.scheduler().schedule(
                Duration.create(EXAM_AUTO_SAVER_START_AFTER_SECONDS, TimeUnit.SECONDS),
                Duration.create(EXAM_AUTO_SAVER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new ExamAutoSaver(composer),
                actor.dispatcher()
        ));
        tasks.put("RESERVATION_POLLER", actor.scheduler().schedule(
                Duration.create(RESERVATION_POLLER_START_AFTER_SECONDS, TimeUnit.SECONDS),
                Duration.create(RESERVATION_POLLER_INTERVAL_HOURS, TimeUnit.HOURS),
                new ReservationPoller(composer),
                actor.dispatcher()
        ));
        tasks.put("EXPIRY_POLLER", actor.scheduler().schedule(
                Duration.create(EXAM_EXPIRY_POLLER_START_AFTER_SECONDS, TimeUnit.SECONDS),
                Duration.create(EXAM_EXPIRY_POLLER_INTERVAL_DAYS, TimeUnit.DAYS),
                new ExamExpiryPoller(),
                actor.dispatcher()
        ));
        tasks.put("AUTOEVALUATION_NOTIFIER", actor.scheduler().schedule(
                Duration.create(AUTO_EVALUATION_NOTIFIER_START_AFTER_SECONDS, TimeUnit.SECONDS),
                Duration.create(AUTO_EVALUATION_NOTIFIER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new AutoEvaluationNotificationPoller(composer),
                actor.dispatcher()
        ));

        scheduleWeeklyReport();

        lifecycle.addStopHook(() -> {
            cancelTasks();
            database.shutdown();
            CacheManager.getInstance().removeCache("play");
            return null;
        });
    }

    private int secondsUntilNextMondayRun(int scheduledHour) {
        DateTime now = DateTime.now();
        DateTime nextRun = now.withHourOfDay(scheduledHour)
                .withMinuteOfHour(0)
                .withSecondOfMinute(0)
                .withMillisOfSecond(0)
                .plusWeeks(now.getDayOfWeek() == DateTimeConstants.MONDAY ? 0 : 1)
                .withDayOfWeek(DateTimeConstants.MONDAY);
        if (nextRun.isBefore(now)) {
            nextRun = nextRun.plusWeeks(1); // now is a Monday after scheduled run time -> postpone
        }
        // Check if default TZ has daylight saving in effect by next run, need to adjust the hour offset in that case
        if (!AppUtil.getDefaultTimeZone().isStandardOffset(nextRun.getMillis())) {
            nextRun = nextRun.minusHours(1);
        }

        Logger.info("Scheduled next weekly report to be run at {}", nextRun.toString());
        return Seconds.secondsBetween(now, nextRun).getSeconds();
    }

    private void scheduleWeeklyReport() {
        // Every Monday at 5AM UTC
        FiniteDuration delay = FiniteDuration.create(secondsUntilNextMondayRun(5), TimeUnit.SECONDS);
        Cancellable reportTask = tasks.get("REPORT_SENDER");
        if (reportTask != null && !reportTask.isCancelled()) {
            reportTask.cancel();
        }
        tasks.put("REPORT_SENDER", actor.scheduler().scheduleOnce(delay, () -> {
            Logger.info("Running weekly email report");
            List<User> teachers = Ebean.find(User.class)
                    .fetch("language")
                    .where()
                    .eq("roles.name", "TEACHER")
                    .findList();
            teachers.stream().forEach(t -> {
                try {
                    composer.composeWeeklySummary(t);
                } catch (RuntimeException e) {
                    Logger.error("Failed to send email for {}", t.getEmail());
                }
            });
            // Reschedule
            scheduleWeeklyReport();
        }, actor.dispatcher()));
    }

    private void cancelTasks() {
        tasks.values().stream().filter(Cancellable::isCancelled).forEach(Cancellable::cancel);
    }
}
