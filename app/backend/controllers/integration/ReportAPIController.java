package backend.controllers.integration;

import backend.controllers.base.BaseController;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamRoom;
import backend.models.Reservation;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Optional;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

public class ReportAPIController extends BaseController {

  @SubjectNotPresent
  public Result getExamEnrolments(Optional<String> start, Optional<String> end) {
    PathProperties pp = PathProperties.parse(
      "(id, enrolledOn, " +
      "reservation(id, machine(id, name, room(name, roomCode)), startAt, endAt), " +
      "user(id, firstName, lastName, eppn, email, userIdentifier), " +
      "exam(id, name, course(name, code, credits, " +
      "gradeScale(description, displayName), organisation(code, name)), duration, examTypeId, executionTypeId, " +
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

    return ok(participations, pp);
  }
}
