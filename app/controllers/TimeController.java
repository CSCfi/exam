// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import java.io.IOException;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.User;
import org.joda.time.DateTime;
import org.joda.time.Seconds;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import util.datetime.DateTimeHandler;

public class TimeController extends BaseController {

    private final DateTimeHandler dateTimeHandler;

    @Inject
    public TimeController(DateTimeHandler dateTimeHandler) {
        this.dateTimeHandler = dateTimeHandler;
    }

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public Result getRemainingExamTime(String hash, Http.Request request) throws IOException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = DB
            .find(ExamEnrolment.class)
            .fetch("externalExam")
            .where()
            .disjunction()
            .eq("exam.hash", hash)
            .eq("externalExam.hash", hash)
            .endJunction()
            .eq("user.id", user.getId())
            .findOne();

        if (enrolment == null) {
            return notFound();
        }

        DateTime reservationStart = getStart(enrolment);
        int durationMinutes = getDuration(enrolment);
        DateTime now = getNow(enrolment);
        Seconds timeLeft = Seconds.secondsBetween(now, reservationStart.plusMinutes(durationMinutes));

        return ok(String.valueOf(timeLeft.getSeconds()));
    }

    private DateTime getStart(ExamEnrolment enrolment) {
        if (enrolment.getExaminationEventConfiguration() != null) {
            return enrolment.getExaminationEventConfiguration().getExaminationEvent().getStart();
        }
        return enrolment.getReservation().getStartAt();
    }

    private DateTime getNow(ExamEnrolment enrolment) {
        if (enrolment.getExaminationEventConfiguration() != null) {
            return DateTime.now();
        }
        return dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation());
    }

    private int getDuration(ExamEnrolment enrolment) throws IOException {
        if (enrolment.getExam() != null) {
            return enrolment.getExam().getDuration();
        }
        Exam exam = enrolment.getExternalExam().deserialize();
        return exam.getDuration();
    }
}
