package backend.controllers.integration;

import backend.controllers.base.BaseController;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.Software;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;
import scala.Function2;

public class ReportAPIController extends BaseController {

    @SubjectNotPresent
    public Result getExamEnrolments(Optional<String> start, Optional<String> end) {
        PathProperties pp = PathProperties.parse(
            "(id, enrolledOn, " +
            "reservation(id, machine(id, name, room(name, roomCode)), startAt, endAt), " +
            "user(id, firstName, lastName, eppn, email, userIdentifier), " +
            "exam(id, name, course(name, code, credits, " +
            "gradeScale(description, displayName), organisation(code, name)), softwares(name), duration, examTypeId, executionTypeId, " +
            "trialCount, answerLanguage, instruction, examActiveStartDate, examActiveEndDate)" +
            ")"
        );

        Query<ExamEnrolment> query = Ebean.find(ExamEnrolment.class);
        pp.apply(query);

        ExpressionList<ExamEnrolment> el = query
            .where()
            .ne("exam.state", Exam.State.PUBLISHED)
            .isNotNull("reservation.machine")
            .ne("reservation.noShow", true);

        if (start.isPresent()) {
            DateTime startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(start.get());
            el = el.ge("reservation.startAt", startDate.toDate());
        }

        if (end.isPresent()) {
            DateTime endDate = ISODateTimeFormat.dateTimeParser().parseDateTime(end.get());
            el = el.lt("reservation.endAt", endDate.toDate());
        }

        List<ExamEnrolment> participations = el.orderBy("reservation.startAt").findList();

        /* Relations from exam to software exist on parent exam, therefore fetch parent exam IDs separately */
        List<Long> parentExamIds = participations
            .stream()
            .filter(participation -> participation.getExam() != null && participation.getExam().getParent() != null)
            .map(participation -> participation.getExam().getParent().getId())
            .distinct()
            .collect(Collectors.toList());

        Map<Long, List<Software>> softwaresByExam = Ebean
            .find(Exam.class)
            .fetch("softwares", "name")
            .where()
            .idIn(parentExamIds)
            .findList()
            .stream()
            .collect(Collectors.toMap(exam -> exam.getId(), exam -> exam.getSoftwareInfo()));

        /* Set software lists to child exams */
        participations
            .stream()
            .filter(
                participation ->
                    participation.getExam() != null &&
                    participation.getExam().getParent() != null &&
                    softwaresByExam.containsKey(participation.getExam().getParent().getId())
            )
            .forEach(
                participation -> {
                    Long parentId = participation.getExam().getParent().getId();
                    List<Software> softwares = softwaresByExam.get(parentId);
                    if (softwares != null || !softwares.isEmpty()) {
                        participation.getExam().setSoftwareInfo(softwares);
                    }
                }
            );

        return ok(participations, pp);
    }
}
