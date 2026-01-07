// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;
import models.base.GeneratedIdentityModel;
import models.enrolment.ExamEnrolment;
import models.exam.Exam;
import models.facility.Software;
import org.joda.time.DateTime;
import org.joda.time.Interval;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

public class ReportAPIController extends BaseController {

    @SubjectNotPresent
    public Result getExamEnrolments(Optional<String> start, Optional<String> end) {
        PathProperties pp = PathProperties.parse(
            "(id, enrolledOn, noShow, " +
                "reservation(id, machine(id, name, room(name, roomCode)), startAt, endAt, externalReservation(orgName)), " +
                "examinationEventConfiguration(examinationEvent(start)), " +
                "exam(id, course(name, code, credits, identifier, courseImplementation, " +
                "gradeScale(description, displayName), organisation(code, name)), " +
                "softwares(name), duration, examType(type), creditType(type), executionType(type), " +
                "implementation, trialCount, answerLanguage, periodStart, periodEnd, " +
                "examParticipation(started, ended, id))" +
                ")"
        );

        Query<ExamEnrolment> query = DB.find(ExamEnrolment.class);
        pp.apply(query);

        List<ExamEnrolment> participations = query
            .where()
            .or()
            .ne("exam.state", Exam.State.PUBLISHED)
            .eq("noShow", true)
            .endOr()
            .or()
            .isNotNull("reservation.machine")
            .isNotNull("reservation.externalReservation")
            .isNotNull("examinationEventConfiguration")
            .endOr()
            .findList()
            .stream()
            .filter(ee -> filterByDate(ee, start, end))
            .toList();

        /* Relations from exam to software exist on parent exam, therefore fetch parent exam IDs separately */
        Set<Long> parentExamIds = participations
            .stream()
            .filter(participation -> participation.getExam() != null && participation.getExam().getParent() != null)
            .map(participation -> participation.getExam().getParent().getId())
            .collect(Collectors.toSet());

        Map<Long, List<Software>> softwareByExam = DB.find(Exam.class)
            .fetch("softwares", "name")
            .where()
            .idIn(parentExamIds)
            .findList()
            .stream()
            .collect(Collectors.toMap(GeneratedIdentityModel::getId, Exam::getSoftwareInfo));

        /* Set software lists to child exams */
        participations
            .stream()
            .filter(
                participation ->
                    participation.getExam() != null &&
                    participation.getExam().getParent() != null &&
                    softwareByExam.containsKey(participation.getExam().getParent().getId())
            )
            .forEach(participation -> {
                Long parentId = participation.getExam().getParent().getId();
                List<Software> software = softwareByExam.get(parentId);
                if (software != null && !software.isEmpty()) {
                    participation.getExam().setSoftwareInfo(software);
                }
            });

        return ok(participations, pp);
    }

    private boolean filterByDate(ExamEnrolment enrolment, Optional<String> start, Optional<String> end) {
        var min = start.orElse(new DateTime(0L).toDateTimeISO().toString());
        var max = end.orElse(new DateTime(Long.MAX_VALUE).toDateTimeISO().toString());
        var startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(min);
        var endDate = ISODateTimeFormat.dateTimeParser().parseDateTime(max);
        var range = new Interval(startDate, endDate);
        if (enrolment.getReservation() != null) {
            var reservation = enrolment.getReservation();
            var period = new Interval(reservation.getStartAt(), reservation.getEndAt());
            return range.contains(period);
        } else if (enrolment.getExaminationEventConfiguration() != null) {
            var event = enrolment.getExaminationEventConfiguration().getExaminationEvent();
            var duration = enrolment.getExam().getDuration();
            var period = new Interval(event.getStart(), event.getStart().plusMinutes(duration));
            return range.contains(period);
        }
        return true; // if we have no date info on this object, just show it
    }
}
