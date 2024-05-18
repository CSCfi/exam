// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Exam;
import models.ExaminationDate;
import models.ExaminationEvent;
import models.ExaminationEventConfiguration;
import models.calendar.MaintenancePeriod;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExaminationDateSanitizer;
import sanitizers.ExaminationEventSanitizer;
import util.config.ByodConfigHandler;
import util.config.ConfigReader;

public class ExaminationEventController extends BaseController {

    private final Logger logger = LoggerFactory.getLogger(ExaminationEventController.class);

    @Inject
    ByodConfigHandler byodConfigHandler;

    @Inject
    ConfigReader configReader;

    // PRINTOUT EXAM RELATED -->
    @With(ExaminationDateSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExaminationDate(Long eid, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound("exam not found");
        }
        LocalDate date = request.attrs().get(Attrs.DATE);
        ExaminationDate ed = new ExaminationDate();
        ed.setDate(date.toDate());
        ed.setExam(exam);
        ed.save();
        return ok(ed);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeExaminationDate(Long id, Long edid) {
        ExaminationDate ed = DB.find(ExaminationDate.class, edid);
        if (ed == null) {
            return notFound("examination date not found");
        }
        ed.delete();
        return ok();
    }

    // <--
    private DateTime getEventEnding(ExaminationEvent ee) {
        ExaminationEventConfiguration config = ee.getExaminationEventConfiguration();
        if (config == null) {
            return ee.getStart();
        }
        return ee.getStart().plusMinutes(config.getExam().getDuration());
    }

    private int getParticipantUpperBound(DateTime start, DateTime end, Long id) {
        ExpressionList<ExaminationEvent> el = DB.find(ExaminationEvent.class).where().le("start", end);
        if (id != null) {
            el = el.ne("id", id);
        }
        return el
            .findSet()
            .stream()
            .filter(ee -> !getEventEnding(ee).isBefore(start))
            .mapToInt(ExaminationEvent::getCapacity)
            .sum();
    }

    private boolean isWithinMaintenancePeriod(Interval interval) {
        return DB
            .find(MaintenancePeriod.class)
            .findSet()
            .stream()
            .map(p -> new Interval(p.getStartsAt(), p.getEndsAt()))
            .anyMatch(i -> i.overlaps(interval));
    }

    @With(ExaminationEventSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExaminationEvent(Long eid, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound("exam not found");
        }
        ExaminationEventConfiguration eec = new ExaminationEventConfiguration();
        // HOX! maybe in the future this can be some preset event shared by multiple exams.
        // For time being lets always create new events.
        ExaminationEvent ee = new ExaminationEvent();
        DateTime start = request.attrs().get(Attrs.START_DATE);
        if (start.isBeforeNow()) {
            return forbidden("i18n_error_examination_event_in_the_past");
        }
        DateTime end = start.plusMinutes(exam.getDuration());
        if (isWithinMaintenancePeriod(new Interval(start, end))) {
            return forbidden("i18n_error_conflicts_with_maintenance_period");
        }
        int ub = getParticipantUpperBound(start, end, null);
        int capacity = request.attrs().get(Attrs.CAPACITY);
        if (capacity + ub > configReader.getMaxByodExaminationParticipantCount()) {
            return forbidden("i18n_error_max_capacity_exceeded");
        }
        String quitPassword = request.attrs().get(Attrs.QUIT_PASSWORD);
        if (exam.getImplementation() == Exam.Implementation.CLIENT_AUTH && quitPassword == null) {
            return forbidden("no quit password provided");
        }
        String settingsPassword = request.attrs().get(Attrs.SETTINGS_PASSWORD);
        if (exam.getImplementation() == Exam.Implementation.CLIENT_AUTH && settingsPassword == null) {
            return forbidden("no settings password provided");
        }
        ee.setStart(start);
        ee.setDescription(request.attrs().get(Attrs.DESCRIPTION));
        ee.setCapacity(request.attrs().get(Attrs.CAPACITY));
        ee.save();
        eec.setExaminationEvent(ee);
        eec.setExam(exam);
        eec.setHash(UUID.randomUUID().toString());
        if (quitPassword != null && settingsPassword != null) {
            encryptQuitPassword(eec, quitPassword);
            encryptSettingsPassword(eec, settingsPassword, quitPassword);
            // Pass back the plaintext password, so it can be shown to user
            eec.setQuitPassword(quitPassword);
            eec.setSettingsPassword(settingsPassword);
        }
        eec.save();
        return ok(eec);
    }

    @With(ExaminationEventSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result updateExaminationEvent(Long eid, Long eecid, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        Optional<ExaminationEventConfiguration> oeec = DB
            .find(ExaminationEventConfiguration.class)
            .where()
            .idEq(eecid)
            .eq("exam.id", eid)
            .findOneOrEmpty();
        if (exam == null || oeec.isEmpty()) {
            return notFound("event not found");
        }
        ExaminationEventConfiguration eec = oeec.get();
        boolean hasEnrolments = !eec.getExamEnrolments().isEmpty();
        ExaminationEvent ee = eec.getExaminationEvent();
        String quitPassword = request.attrs().get(Attrs.QUIT_PASSWORD);
        if (eec.getExam().getImplementation() == Exam.Implementation.CLIENT_AUTH && quitPassword == null) {
            return forbidden("no quit password provided");
        }
        String settingsPassword = request.attrs().get(Attrs.SETTINGS_PASSWORD);
        if (eec.getExam().getImplementation() == Exam.Implementation.CLIENT_AUTH && settingsPassword == null) {
            return forbidden("no settings password provided");
        }
        DateTime start = request.attrs().get(Attrs.START_DATE);
        if (!hasEnrolments) {
            if (start.isBeforeNow()) {
                return forbidden("i18n_error_examination_event_in_the_past");
            }
            ee.setStart(start);
        }
        DateTime end = start.plusMinutes(exam.getDuration());
        if (isWithinMaintenancePeriod(new Interval(start, end))) {
            return forbidden("i18n_error_conflicts_with_maintenance_period");
        }
        int ub = getParticipantUpperBound(start, end, ee.getId());
        int capacity = request.attrs().get(Attrs.CAPACITY);
        if (capacity + ub > configReader.getMaxByodExaminationParticipantCount()) {
            return forbidden("i18n_error_max_capacity_exceeded");
        }
        ee.setCapacity(capacity);
        ee.setDescription(request.attrs().get(Attrs.DESCRIPTION));
        ee.update();
        if (quitPassword == null || settingsPassword == null) {
            return ok(eec);
        }
        if (!hasEnrolments) {
            encryptQuitPassword(eec, quitPassword);
            encryptSettingsPassword(eec, settingsPassword, quitPassword);
            eec.save();
            // Pass back the plaintext passwords, so they can be shown to user
            eec.setQuitPassword(quitPassword);
            eec.setSettingsPassword(settingsPassword);
        } else {
            // Disallow changing password if enrolments exist for this event
            // Pass back the original unchanged passwords
            eec.setQuitPassword(
                byodConfigHandler.getPlaintextPassword(eec.getEncryptedQuitPassword(), eec.getQuitPasswordSalt())
            );
            eec.setSettingsPassword(
                byodConfigHandler.getPlaintextPassword(
                    eec.getEncryptedSettingsPassword(),
                    eec.getSettingsPasswordSalt()
                )
            );
        }
        return ok(eec);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result removeExaminationEvent(Long eid, Long eeid) {
        Optional<ExaminationEventConfiguration> oeec = DB
            .find(ExaminationEventConfiguration.class)
            .where()
            .idEq(eeid)
            .eq("exam.id", eid)
            .findOneOrEmpty();
        Exam exam = DB.find(Exam.class, eid);
        if (oeec.isEmpty() || exam == null) {
            return notFound("event not found");
        }
        ExaminationEventConfiguration eec = oeec.get();
        if (!eec.getExamEnrolments().isEmpty()) {
            return forbidden("event can not be deleted because there are enrolments involved");
        }
        eec.delete();
        // Check if we can delete the event altogether (in case no configs are using it)
        Set<ExaminationEventConfiguration> configs = DB
            .find(ExaminationEventConfiguration.class)
            .where()
            .eq("examinationEvent", eec.getExaminationEvent())
            .findSet();
        if (configs.isEmpty()) {
            eec.getExaminationEvent().delete();
        }
        return ok();
    }

    private void encryptSettingsPassword(ExaminationEventConfiguration eec, String password, String quitPassword) {
        try {
            String oldPwd = eec.getEncryptedSettingsPassword() != null
                ? byodConfigHandler.getPlaintextPassword(
                    eec.getEncryptedSettingsPassword(),
                    eec.getSettingsPasswordSalt()
                )
                : null;

            if (!password.equals(oldPwd)) {
                String newSalt = UUID.randomUUID().toString();
                eec.setEncryptedSettingsPassword(byodConfigHandler.getEncryptedPassword(password, newSalt));
                eec.setSettingsPasswordSalt(newSalt);
                // Pre-calculate config key, so we don't need to do it each time a check is needed
                eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash(), quitPassword));
            }
        } catch (Exception e) {
            logger.error("unable to set settings password", e);
            throw new RuntimeException(e);
        }
    }

    private void encryptQuitPassword(ExaminationEventConfiguration eec, String password) {
        try {
            String oldPwd = eec.getEncryptedQuitPassword() != null
                ? byodConfigHandler.getPlaintextPassword(eec.getEncryptedQuitPassword(), eec.getQuitPasswordSalt())
                : null;

            if (!password.equals(oldPwd)) {
                String newSalt = UUID.randomUUID().toString();
                eec.setEncryptedQuitPassword(byodConfigHandler.getEncryptedPassword(password, newSalt));
                eec.setQuitPasswordSalt(newSalt);
                // Pre-calculate config key, so we don't need to do it each time a check is needed
                eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash(), password));
            }
        } catch (Exception e) {
            logger.error("unable to set settings password", e);
            throw new RuntimeException(e);
        }
    }

    @Restrict({ @Group("ADMIN") })
    public Result listExaminationEvents(Optional<String> start, Optional<String> end) {
        PathProperties pp = PathProperties.parse(
            "(*, exam(*, course(*), examOwners(*)), examinationEvent(*), examEnrolments(*))"
        );
        ExpressionList<ExaminationEventConfiguration> query = DB
            .find(ExaminationEventConfiguration.class)
            .apply(pp)
            .where();
        if (start.isPresent()) {
            DateTime startDate = DateTime.parse(start.get(), ISODateTimeFormat.dateTimeParser());
            query = query.ge("examinationEvent.start", startDate.toDate());
        }
        if (end.isPresent()) {
            DateTime endDate = DateTime.parse(end.get(), ISODateTimeFormat.dateTimeParser());
            query = query.lt("examinationEvent.start", endDate.toDate());
        }
        Set<ExaminationEventConfiguration> exams = query.where().eq("exam.state", Exam.State.PUBLISHED).findSet();
        return ok(exams, pp);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result listOverlappingExaminationEvents(String start, Integer duration) {
        PathProperties pp = PathProperties.parse("(*, examinationEventConfiguration(exam(id, duration)))");
        DateTime startDate = DateTime.parse(start, ISODateTimeFormat.dateTimeParser());
        DateTime endDate = startDate.plusMinutes(duration);
        Set<ExaminationEvent> events = DB
            .find(ExaminationEvent.class)
            .where()
            .le("start", endDate)
            .findSet()
            .stream()
            .filter(ee -> !getEventEnding(ee).isBefore(startDate))
            .collect(Collectors.toSet());
        return ok(events, pp);
    }
}
