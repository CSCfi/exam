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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.Ebean;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import javax.inject.Inject;
import models.Exam;
import models.ExaminationDate;
import models.ExaminationEvent;
import models.ExaminationEventConfiguration;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExaminationDateSanitizer;
import sanitizers.ExaminationEventSanitizer;
import util.config.ByodConfigHandler;

public class ExaminationEventController extends BaseController {

    private static final Logger.ALogger logger = Logger.of(ExaminationEventController.class);

    @Inject
    ByodConfigHandler byodConfigHandler;

    // PRINTOUT EXAM RELATED -->
    @With(ExaminationDateSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExaminationDate(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
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
        ExaminationDate ed = Ebean.find(ExaminationDate.class, edid);
        if (ed == null) {
            return notFound("examination date not found");
        }
        ed.delete();
        return ok();
    }

    // <--

    @With(ExaminationEventSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result insertExaminationEvent(Long eid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("exam not found");
        }
        ExaminationEventConfiguration eec = new ExaminationEventConfiguration();
        // HOX! maybe in the future this can be some preset event shared by multiple exams.
        // For time being lets always create new events.
        ExaminationEvent ee = new ExaminationEvent();
        DateTime start = request.attrs().get(Attrs.START_DATE);
        if (start.isBeforeNow()) {
            return forbidden("start occasion in the past");
        }
        String password = request.attrs().get(Attrs.SETTINGS_PASSWORD);
        if (exam.getImplementation() == Exam.Implementation.CLIENT_AUTH && password == null) {
            return forbidden("no password provided");
        }
        ee.setStart(start);
        ee.setDescription(request.attrs().get(Attrs.DESCRIPTION));
        ee.save();
        eec.setExaminationEvent(ee);
        eec.setExam(exam);
        eec.setHash(UUID.randomUUID().toString());
        if (password != null) {
            encryptSettingsPassword(eec, password);
        }
        eec.save();
        // Pass back the plaintext password so it can be shown to user
        eec.setSettingsPassword(request.attrs().get(Attrs.SETTINGS_PASSWORD));
        return ok(eec);
    }

    @With(ExaminationEventSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result updateExaminationEvent(Long eid, Long eecid, Http.Request request) {
        Optional<ExaminationEventConfiguration> oeec = Ebean
            .find(ExaminationEventConfiguration.class)
            .where()
            .idEq(eecid)
            .eq("exam.id", eid)
            .findOneOrEmpty();
        if (oeec.isEmpty()) {
            return notFound("event not found");
        }
        ExaminationEventConfiguration eec = oeec.get();
        boolean hasEnrolments = eec.getExamEnrolments().size() > 0;
        ExaminationEvent ee = eec.getExaminationEvent();
        String password = request.attrs().get(Attrs.SETTINGS_PASSWORD);
        if (eec.getExam().getImplementation() == Exam.Implementation.CLIENT_AUTH && password == null) {
            return forbidden("no password provided");
        }
        if (!hasEnrolments) {
            DateTime start = request.attrs().get(Attrs.START_DATE);
            if (start.isBeforeNow()) {
                return forbidden("start occasion in the past");
            }
            ee.setStart(start);
        }
        ee.setDescription(request.attrs().get(Attrs.DESCRIPTION));
        ee.update();
        if (password == null) {
            return ok(eec);
        } else if (!hasEnrolments) {
            encryptSettingsPassword(eec, password);
            eec.save();
            // Pass back the plaintext password so it can be shown to user
            eec.setSettingsPassword(request.attrs().get(Attrs.SETTINGS_PASSWORD));
        } else {
            // Disallow changing password if enrolments exist for this event
            // TODO: check how this could be made possible. Would need resending seb-files with new encryption
            // Send back the original (unchanged password)
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
        Optional<ExaminationEventConfiguration> oeec = Ebean
            .find(ExaminationEventConfiguration.class)
            .where()
            .idEq(eeid)
            .eq("exam.id", eid)
            .findOneOrEmpty();
        Exam exam = Ebean.find(Exam.class, eid);
        if (oeec.isEmpty() || exam == null) {
            return notFound("event not found");
        }
        ExaminationEventConfiguration eec = oeec.get();
        if (!eec.getExamEnrolments().isEmpty()) {
            return forbidden("event can not be deleted because there are enrolments involved");
        }
        eec.delete();
        // Check if we can delete the event altogether (in case no configs are using it)
        Set<ExaminationEventConfiguration> configs = Ebean
            .find(ExaminationEventConfiguration.class)
            .where()
            .eq("examinationEvent", eec.getExaminationEvent())
            .findSet();
        if (configs.isEmpty()) {
            eec.getExaminationEvent().delete();
        }
        return ok();
    }

    private void encryptSettingsPassword(ExaminationEventConfiguration eec, String password) {
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
                // Pre-calculate config key so we don't need to do it each time a check is needed
                eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash()));
            }
        } catch (Exception e) {
            logger.error("unable to set settings password", e);
            throw new RuntimeException(e);
        }
    }
}
