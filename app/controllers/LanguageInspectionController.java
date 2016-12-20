package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Dynamic;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import controllers.base.BaseController;
import models.Comment;
import models.Exam;
import models.LanguageInspection;
import models.User;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;


public class LanguageInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Dynamic(value="inspector or admin", meta="pattern=CAN_INSPECT_LANGUAGE,role=ADMIN,anyMatch=true")
    public Result listInspections(Optional<String> month, Optional<Long> start, Optional<Long> end) {
        ExpressionList<LanguageInspection> query = Ebean.find(LanguageInspection.class)
                .fetch("exam")
                .fetch("exam.course")
                .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
                .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
                .fetch("statement")
                .fetch("creator", "firstName, lastName, email, userIdentifier")
                .fetch("assignee", "firstName, lastName, email, userIdentifier")
                .where();

        if(start.isPresent() || end.isPresent()) {
            if (start.isPresent()) {
                DateTime startDate = new DateTime(start.get()).withTimeAtStartOfDay();
                query = query.ge("finishedAt", startDate.toDate());
            }

            if (end.isPresent()) {
                DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
                query = query.lt("finishedAt", endDate.toDate());
            }
        }
        else if (month.isPresent()) {
            DateTime startWithMonth = DateTime.parse(month.get()).withDayOfMonth(1).withMillisOfDay(0);
            DateTime endWithMonth = startWithMonth.plusMonths(1);
            query = query.between("finishedAt", startWithMonth.toDate(), endWithMonth.toDate());
        }
        else {
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
        DynamicForm df = formFactory.form().bindFromRequest();
        Long examId = Long.parseLong(df.get("examId"));
        Exam exam = Ebean.find(Exam.class, examId);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.getLanguageInspection() != null) {
            return forbidden("already sent for inspection");
        }
        if (!exam.isSubjectToLanguageInspection()) {
            return forbidden("not allowed to send for inspection");
        }
        LanguageInspection inspection = new LanguageInspection();
        User user = getLoggedUser();
        AppUtil.setCreator(inspection, user);
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
        User user = getLoggedUser();
        AppUtil.setModifier(inspection, user);
        inspection.setAssignee(user);
        inspection.setStartedAt(new Date());
        inspection.update();
        return ok();
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setApproval(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
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

        User user = getLoggedUser();
        AppUtil.setModifier(inspection, user);
        inspection.update();

        Set<User> recipients = inspection.getExam().getParent().getExamOwners();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User recipient : recipients) {
                emailComposer.composeLanguageInspectionFinishedMessage(recipient, user, inspection);
                Logger.info("Language inspection finalization email sent to {}", recipient.getEmail());
            }
        }, actor.dispatcher());


        return ok();
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setStatement(Long id) {
        DynamicForm df = formFactory.form().bindFromRequest();
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
        User user = getLoggedUser();
        Comment statement = inspection.getStatement();
        if (statement == null) {
            statement = new Comment();
            AppUtil.setCreator(statement, user);
            statement.save();
            inspection.setStatement(statement);
            inspection.update();
        }
        statement.setComment(text);
        AppUtil.setModifier(statement, user);
        statement.update();
        AppUtil.setModifier(inspection, user);
        inspection.update();
        return ok();
    }

}
