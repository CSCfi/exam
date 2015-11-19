package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import models.Comment;
import models.Exam;
import models.LanguageInspection;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.concurrent.TimeUnit;


public class LanguageInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result listInspections(F.Option<String> month) {
        ExpressionList<LanguageInspection> query = Ebean.find(LanguageInspection.class)
                .fetch("exam")
                .fetch("exam.course")
                .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
                .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
                .fetch("statement")
                .fetch("creator", "firstName, lastName, email, userIdentifier")
                .fetch("assignee", "firstName, lastName, email, userIdentifier")
                .where();
        if (month.isDefined()) {
            DateTime start = DateTime.parse(month.get()).withDayOfMonth(1).withMillisOfDay(0);
            DateTime end = start.plusMonths(1);
            query = query.between("finishedAt", start.toDate(), end.toDate());
        } else {
            DateTime beginningOfYear = DateTime.now().withDayOfYear(1);
            query = query
                    .disjunction()
                    .isNull("finishedAt")
                    .gt("finishedAt", beginningOfYear.toDate())
                    .endJunction();
        }
        List<LanguageInspection> inspections = query.findList();
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
        boolean isApproved = Boolean.parseBoolean(df.get("approved"));
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
        if (inspection.getStatement() == null || inspection.getStatement().getComment().isEmpty()) {
            return forbidden("No statement given");
        }
        inspection.setFinishedAt(new Date());
        inspection.setApproved(isApproved);
        inspection.update();

        Set<User> recipients = inspection.getExam().getParent().getExamOwners();
        User sender = getLoggedUser();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User recipient : recipients) {
                emailComposer.composeLanguageInspectionFinishedMessage(recipient, sender, inspection);
                Logger.info("Language inspection finalization email sent to {}", recipient.getEmail());
            }
        }, actor.dispatcher());


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
