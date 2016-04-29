package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Model;
import models.Comment;
import models.Exam;
import models.ExamInspection;
import models.User;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.Set;
import java.util.concurrent.TimeUnit;


public class ExamInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertInspection(Long eid, Long uid) {
        ExamInspection inspection = bindForm(ExamInspection.class);
        User recipient = Ebean.find(User.class, uid);
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (isInspectorOf(recipient, exam)) {
            return forbidden("already an inspector");
        }
        Comment comment = inspection.getComment();
        String msg = comment.getComment();
        // Exam name required before adding inspectors that are to receive an email notification
        if ((exam.getName() == null || exam.getName().isEmpty()) && !msg.isEmpty()) {
            return badRequest("sitnet_exam_name_missing_or_too_short");
        }
        inspection.setExam(exam);
        inspection.setUser(recipient);
        inspection.setAssignedBy(getLoggedUser());
        if (!msg.isEmpty()) {
            AppUtil.setCreator(comment, getLoggedUser());
            inspection.setComment(comment);
            comment.save();
            actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS),
                    () -> emailComposer.composeExamReviewRequest(recipient, getLoggedUser(), exam, msg),
                    actor.dispatcher());
        }
        inspection.save();
        // Add also as inspector to ongoing child exams if not already there.
        exam.getChildren().stream()
                .filter(c -> c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED) &&
                        !isInspectorOf(recipient, c))
                .forEach(c -> {
                    ExamInspection i = new ExamInspection();
                    i.setExam(c);
                    i.setUser(recipient);
                    i.setAssignedBy(getLoggedUser());
                    i.save();
                });

        return ok(Json.toJson(inspection));
    }

    private static boolean isInspectorOf(User user, Exam exam) {
        return exam.getExamInspections().stream()
                .anyMatch(ei -> ei.getUser().equals(user));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamInspections(Long id) {
        Set<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user", "id, email, firstName, lastName")
                .where()
                .eq("exam.id", id)
                .findSet();
        return ok(inspections);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateInspection(Long id) {

        boolean ready = Boolean.parseBoolean(formFactory.form().bindFromRequest().get("ready"));
        ExamInspection inspection = Ebean.find(ExamInspection.class, id);

        if (inspection == null) {
            return notFound();
        }
        inspection.setReady(ready);
        inspection.update();

        return ok();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteInspection(Long id) {
        ExamInspection inspection = Ebean.find(ExamInspection.class, id);
        if (inspection == null) {
            return notFound("sitnet_error_not_found");
        }
        User inspector = inspection.getUser();
        Exam exam = inspection.getExam();
        exam.getChildren()
                .stream()
                .filter(c -> c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED))
                .forEach(c -> c.getExamInspections()
                        .stream()
                        .filter(ei -> ei.getUser().equals(inspector))
                        .forEach(Model::delete));
        inspection.delete();
        return ok();
    }

}
