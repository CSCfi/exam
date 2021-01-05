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

package backend.controllers;

import backend.controllers.base.BaseController;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.User;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.datetime.DateTimeUtils;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import java.io.IOException;
import org.joda.time.DateTime;
import org.joda.time.Seconds;
import play.mvc.Http;
import play.mvc.Result;

public class TimeController extends BaseController {

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    public Result getRemainingExamTime(String hash, Http.Request request) throws IOException {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamEnrolment enrolment = Ebean
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
        return DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation());
    }

    private int getDuration(ExamEnrolment enrolment) throws IOException {
        if (enrolment.getExam() != null) {
            return enrolment.getExam().getDuration();
        }
        Exam exam = enrolment.getExternalExam().deserialize();
        return exam.getDuration();
    }
}
