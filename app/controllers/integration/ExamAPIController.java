package controllers.integration;


import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import models.Exam;
import models.ExamExecutionType;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

import java.util.List;
import java.util.Optional;

public class ExamAPIController extends BaseController {

    @SubjectNotPresent
    public Result getActiveExams(Optional<String> date) {
        PathProperties pp = PathProperties.parse("(course(name, code, credits, " +
                "gradeScale(description, externalRef, displayName), organisation(code, name, nameAbbreviation)) " +
                "name, examActiveStartDate, examActiveEndDate, duration, enrollInstruction, examLanguages(code, name) " +
                "gradeScale(description, externalRef, displayName), examOwners(firstName, lastName, email), " +
                "examType(type)" +
                ")");
        DateTime dateTime = date.isPresent() ?
                ISODateTimeFormat.dateTimeParser().parseDateTime(date.get()) :
                DateTime.now();
        Query<Exam> query = Ebean.find(Exam.class);
        query.apply(pp);
        List<Exam> exams = query.where()
                .eq("state", Exam.State.PUBLISHED)
                .lt("examActiveStartDate", dateTime)
                .ge("examActiveEndDate", dateTime)
                .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
                .findList();

        return ok(exams, pp);
    }


}
