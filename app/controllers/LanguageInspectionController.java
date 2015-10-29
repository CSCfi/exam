package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.LanguageInspection;
import org.joda.time.DateTime;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;

import java.util.Date;
import java.util.List;


public class LanguageInspectionController extends BaseController {

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result listInspections() {
        DateTime beginningOfYear = DateTime.now().withDayOfYear(1);
        List<LanguageInspection> inspections = Ebean.find(LanguageInspection.class)
                .fetch("exam")
                .fetch("exam.course")
                .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
                .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
                .fetch("statement")
                .fetch("creator", "firstName, lastName, email, userIdentifier")
                .fetch("assignee", "firstName, lastName, email, userIdentifier")
                .where()
                .disjunction()
                .isNull("finishedAt")
                .gt("finishedAt", beginningOfYear.toDate())
                .endJunction()
                .findList();
        return ok(inspections);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result createInspection() {
        DynamicForm df = Form.form().bindFromRequest();
        Long examId = Long.parseLong(df.get("examId"));
        Exam exam = Ebean.find(Exam.class, examId);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.getLanguageInspection() != null) {
            return forbidden("already sent for inspection");
        }
        LanguageInspection inspection = new LanguageInspection();
        inspection.setCreator(getLoggedUser());
        inspection.setCreated(new Date());
        inspection.setExam(exam);
        inspection.save();
        return ok();
    }
}
