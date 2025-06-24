// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.enrolment;

import impl.NoShowHandler;
import io.ebean.DB;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import javax.inject.Inject;
import models.enrolment.ExamEnrolment;
import models.enrolment.Reservation;
import models.exam.Exam;
import models.user.User;
import scala.jdk.javaapi.CollectionConverters;

public class EnrolmentHandlerImpl implements EnrolmentHandler {

    private final NoShowHandler noShowHandler;

    @Inject
    public EnrolmentHandlerImpl(NoShowHandler noShowHandler) {
        this.noShowHandler = noShowHandler;
    }

    public boolean isAllowedToParticipate(Exam exam, User user) {
        handleNoShow(user, exam.getId());
        Integer trialCount = exam.getTrialCount();
        if (trialCount == null) {
            return true;
        }
        var trials = DB.find(ExamEnrolment.class)
            .fetch("exam")
            .where()
            .eq("user", user)
            .eq("exam.parent.id", exam.getId())
            .ne("exam.state", Exam.State.DELETED)
            .ne("exam.state", Exam.State.INITIALIZED)
            .ne("retrialPermitted", true)
            .findList()
            .stream()
            .sorted(Comparator.comparing(ExamEnrolment::getId).reversed())
            .toList();

        if (trials.size() >= trialCount) {
            return trials.stream().limit(trialCount).anyMatch(ExamEnrolment::isProcessed);
        }
        return true;
    }

    private void handleNoShow(User user, Long examId) {
        var enrolments = DB.find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("exam")
            .where()
            .eq("user", user)
            .eq("noShow", false)
            .or()
            .lt("reservation.endAt", new Date())
            .lt("examinationEventConfiguration.examinationEvent.start", new Date()) // FIXME: exam period
            .endOr()
            // Either (a) exam id matches and exam state is published OR
            //        (b) collaborative exam id matches and exam is NULL
            .or()
            .and()
            .eq("exam.id", examId)
            .eq("exam.state", Exam.State.PUBLISHED)
            .endAnd()
            .and()
            .eq("collaborativeExam.id", examId)
            .isNull("exam")
            .endAnd()
            .endOr()
            .isNull("reservation.externalReservation")
            .findList();
        noShowHandler.handleNoShows(
            CollectionConverters.asScala(enrolments).toList(),
            CollectionConverters.asScala(new ArrayList<Reservation>()).toList()
        );
    }
}
