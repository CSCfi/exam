// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.Model;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import models.assessment.Comment;
import models.assessment.ExamInspection;
import models.exam.Exam;
import models.user.Role;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.CommentSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;

public class ExamInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    @Authenticated
    @With(CommentSanitizer.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result addInspection(Long eid, Long uid, Http.Request request) {
        User recipient = DB.find(User.class, uid);
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null || recipient == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return forbidden("i18n_error_access_forbidden");
        }
        Optional<String> comment = request.attrs().getOptional(Attrs.COMMENT);
        // Exam name required before adding inspectors that are to receive an email notification
        if ((exam.getName() == null || exam.getName().isEmpty()) && comment.isPresent()) {
            return badRequest("i18n_exam_name_missing_or_too_short");
        }
        ExamInspection inspection = new ExamInspection();
        inspection.setExam(exam);
        inspection.setUser(recipient);
        inspection.setAssignedBy(user);
        if (comment.isPresent()) {
            Comment c = new Comment();
            c.setCreatorWithDate(user);
            c.setComment(comment.get());
            inspection.setComment(c);
            c.save();
            actor
                .scheduler()
                .scheduleOnce(
                    Duration.create(1, TimeUnit.SECONDS),
                    () -> emailComposer.composeExamReviewRequest(recipient, user, exam, comment.get()),
                    actor.dispatcher()
                );
        }
        inspection.save();
        // Add also as inspector to ongoing child exams if not already there.
        exam
            .getChildren()
            .stream()
            .filter(
                c ->
                    c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED) &&
                    !isInspectorOf(recipient, c)
            )
            .forEach(c -> {
                ExamInspection i = new ExamInspection();
                i.setExam(c);
                i.setUser(recipient);
                i.setAssignedBy(user);
                i.save();
            });

        return ok(Json.toJson(inspection));
    }

    private static boolean isInspectorOf(User user, Exam exam) {
        return exam.getExamInspections().stream().anyMatch(ei -> ei.getUser().equals(user));
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result getExamInspections(Long id) {
        Set<ExamInspection> inspections = DB.find(ExamInspection.class)
            .fetch("user", "id, email, firstName, lastName")
            .where()
            .eq("exam.id", id)
            .findSet();
        return ok(inspections);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result setInspectionOutcome(Long id, Http.Request request) {
        boolean ready = Boolean.parseBoolean(formFactory.form().bindFromRequest(request).get("ready"));
        ExamInspection inspection = DB.find(ExamInspection.class, id);

        if (inspection == null) {
            return notFound();
        }
        inspection.setReady(ready);
        inspection.update();

        return ok();
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result deleteInspection(Long id) {
        ExamInspection inspection = DB.find(ExamInspection.class, id);
        if (inspection == null) {
            return notFound("i18n_error_not_found");
        }
        User inspector = inspection.getUser();
        Exam exam = inspection.getExam();
        exam
            .getChildren()
            .stream()
            .filter(c -> c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED))
            .forEach(c ->
                c.getExamInspections().stream().filter(ei -> ei.getUser().equals(inspector)).forEach(Model::delete)
            );
        inspection.delete();
        return ok();
    }
}
