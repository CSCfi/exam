package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Comment;
import models.Exam;
import models.LanguageInspection;
import org.joda.time.DateTime;
import play.data.DynamicForm;
import play.data.Form;
import play.mvc.Result;
import util.AppUtil;

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

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result assignInspection(Long id) {
        LanguageInspection inspection = Ebean.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        if (inspection.getAssignee() != null) {
            return forbidden("Inspection already taken");
        }
        inspection.setAssignee(getLoggedUser());
        inspection.setStartedAt(new Date());
        inspection.update();
        return ok();
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setApproval(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        String verdict = df.get("approved");
        if (verdict == null) {
            return badRequest();
        }
        boolean isApproved = Boolean.parseBoolean(verdict);
        LanguageInspection inspection = Ebean.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        if (inspection.getStartedAt() == null) {
            return forbidden("Inspection not assigned");
        }
        if (inspection.getFinishedAt() != null) {
            return forbidden("Inspection already finalized");
        }
        inspection.setFinishedAt(new Date());
        inspection.setApproved(isApproved);
        inspection.update();
        return ok();
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setStatement(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        String text = df.get("comment");
        if (text == null) {
            return badRequest();
        }
        LanguageInspection inspection = Ebean.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        if (inspection.getStartedAt() == null) {
            return forbidden("Inspection not assigned");
        }
        if (inspection.getFinishedAt() != null) {
            return forbidden("Inspection already finalized");
        }
        Comment statement = inspection.getStatement();
        if (statement == null) {
            statement = new Comment();
            AppUtil.setCreator(statement, getLoggedUser());
            statement.save();
            inspection.setStatement(statement);
            inspection.update();
        }
        statement.setComment(text);
        statement.update();
        return ok();
    }

}
