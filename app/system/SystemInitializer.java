package system;


import akka.actor.ActorSystem;
import akka.actor.Cancellable;
import akka.actor.Scheduler;
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
import java.util.List;
import java.util.TimeZone;
import java.util.concurrent.TimeUnit;

@Singleton
public class SystemInitializer {

    public static final int EXAM_AUTO_SAVER_START_AFTER_MINUTES = 1;
    public static final int EXAM_AUTO_SAVER_INTERVAL_MINUTES = 1;
    public static final int RESERVATION_POLLER_START_AFTER_MINUTES = 1;
    public static final int RESERVATION_POLLER_INTERVAL_HOURS = 1;
    public static final int EXAM_EXPIRY_POLLER_START_AFTER_MINUTES = 1;
    public static final int EXAM_EXPIRY_POLLER_INTERVAL_DAYS = 1;


    protected ApplicationLifecycle lifecycle;
    protected EmailComposer composer;
    protected ActorSystem actor;
    protected Database database;

    private Scheduler reportSender;
    private Cancellable autosaver;
    private Cancellable reservationPoller;
    private Cancellable reportTask;
    private Cancellable examExpirationPoller;

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
        autosaver = actor.scheduler().schedule(
                Duration.create(EXAM_AUTO_SAVER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(EXAM_AUTO_SAVER_INTERVAL_MINUTES, TimeUnit.MINUTES),
                new ExamAutoSaver(composer),
                actor.dispatcher()
        );
        reservationPoller = actor.scheduler().schedule(
                Duration.create(RESERVATION_POLLER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(RESERVATION_POLLER_INTERVAL_HOURS, TimeUnit.HOURS),
                new ReservationPoller(composer),
                actor.dispatcher()
        );
        examExpirationPoller = actor.scheduler().schedule(
                Duration.create(EXAM_EXPIRY_POLLER_START_AFTER_MINUTES, TimeUnit.MINUTES),
                Duration.create(EXAM_EXPIRY_POLLER_INTERVAL_DAYS, TimeUnit.DAYS),
                new ExamExpiryPoller(),
                actor.dispatcher()
        );
        reportSender = actor.scheduler();
        scheduleWeeklyReport();

        lifecycle.addStopHook(() -> {
            cancelReportSender();
            cancelAutosaver();
            cancelReservationPoller();
            cancelExpirationPoller();
            database.shutdown();
            CacheManager.getInstance().removeCache("play");
            return null;
        });
    }

    private int secondsUntilNextMondayRun(int scheduledHour) {
        DateTime now = DateTime.now();
        int adjustedHours = scheduledHour;
        if (!AppUtil.getDefaultTimeZone().isStandardOffset(now.getMillis())) {
            // Have the run happen an hour earlier to take care of DST offset
            adjustedHours -= 1;
        }

        DateTime nextRun = now.withHourOfDay(adjustedHours)
                .withMinuteOfHour(0)
                .withSecondOfMinute(0)
                .withMillisOfSecond(0)
                .plusWeeks(now.getDayOfWeek() == DateTimeConstants.MONDAY ? 0 : 1)
                .withDayOfWeek(DateTimeConstants.MONDAY);
        if (!nextRun.isAfter(now)) {
            nextRun = nextRun.plusWeeks(1); // now is a Monday after scheduled run time -> postpone
        }
        // Case for: now there's no DST but by next run there will be.
        if (adjustedHours == scheduledHour && !AppUtil.getDefaultTimeZone().isStandardOffset(nextRun.getMillis())) {
            nextRun = nextRun.minusHours(1);
        }
        // Case for: now there's DST but by next run there won't be
        else if (adjustedHours != scheduledHour && AppUtil.getDefaultTimeZone().isStandardOffset(nextRun.getMillis())) {
            nextRun = nextRun.plusHours(1);
        }

        Logger.info("Scheduled next weekly report to be run at {}", nextRun.toString());
        // Increase delay with one second so that this won't fire off before intended time. This may happen because of
        // millisecond-level rounding issues and possibly cause resending of messages.
        return Seconds.secondsBetween(now, nextRun).getSeconds() + 1;
    }

    private void scheduleWeeklyReport() {
        // TODO: store the time of last dispatch in db so we know if scheduler was not run and send an extra report
        // in that case?

        // Every Monday at 5AM UTC
        FiniteDuration delay = FiniteDuration.create(secondsUntilNextMondayRun(5), TimeUnit.SECONDS);
        cancelReportSender();
        reportTask = reportSender.scheduleOnce(delay, () -> {
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
        }, actor.dispatcher());
    }

    private void cancelReportSender() {
        if (reportTask != null && !reportTask.isCancelled()) {
            Logger.info("Canceling report sender returned: {}", reportTask.cancel());
        }
    }

    private void cancelAutosaver() {
        if (autosaver != null && !autosaver.isCancelled()) {
            autosaver.cancel();
        }
    }

    private void cancelReservationPoller() {
        if (reservationPoller != null && !reservationPoller.isCancelled()) {
            reservationPoller.cancel();
        }
    }

    private void cancelExpirationPoller() {
        if (examExpirationPoller != null && !examExpirationPoller.isCancelled()) {
            examExpirationPoller.cancel();
        }
    }
}
