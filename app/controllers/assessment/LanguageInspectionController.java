// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment;

import be.objectify.deadbolt.java.actions.Dynamic;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import impl.mail.EmailComposer;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;
import models.assessment.Comment;
import models.assessment.LanguageInspection;
import models.exam.Exam;
import models.user.User;
import org.apache.pekko.actor.ActorSystem;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.CommentSanitizer;
import scala.concurrent.duration.Duration;
import security.Authenticated;

public class LanguageInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    private final Logger logger = LoggerFactory.getLogger(LanguageInspectionController.class);

    @Dynamic(value = "inspector or admin", meta = "pattern=CAN_INSPECT_LANGUAGE,role=ADMIN,anyMatch=true")
    public Result listInspections(Optional<String> month, Optional<Long> start, Optional<Long> end) {
        ExpressionList<LanguageInspection> query = DB.find(LanguageInspection.class)
            .fetch("exam")
            .fetch("exam.course")
            .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
            .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
            .fetch("exam.examLanguages", FetchConfig.ofQuery())
            .fetch("statement")
            .fetch("creator", "firstName, lastName, email, userIdentifier")
            .fetch("assignee", "firstName, lastName, email, userIdentifier")
            .where()
            .ne("exam.state", Exam.State.DELETED);

        if (start.isPresent() || end.isPresent()) {
            if (start.isPresent()) {
                DateTime startDate = new DateTime(start.get()).plusDays(1).withTimeAtStartOfDay();
                query = query.ge("finishedAt", startDate.toDate());
            }

            if (end.isPresent()) {
                DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
                query = query.lt("finishedAt", endDate.toDate());
            }
        } else if (month.isPresent()) {
            String decoded = URLDecoder.decode(month.get(), StandardCharsets.UTF_8);
            DateTime startWithMonth = DateTime.parse(decoded).withMillisOfDay(0);
            DateTime endWithMonth = startWithMonth.plusMonths(1);
            query = query.between("finishedAt", startWithMonth.toDate(), endWithMonth.toDate());
        }

        return ok(query.findSet());
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result createInspection(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        Long examId = Long.parseLong(df.get("examId"));
        Exam exam = DB.find(Exam.class, examId);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        if (exam.getLanguageInspection() != null) {
            return forbidden("already sent for inspection");
        }
        if (!exam.getSubjectToLanguageInspection()) {
            return forbidden("not allowed to send for inspection");
        }
        LanguageInspection inspection = new LanguageInspection();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        inspection.setCreatorWithDate(user);
        inspection.setExam(exam);
        inspection.save();
        return ok();
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result assignInspection(Long id, Http.Request request) {
        LanguageInspection inspection = DB.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        if (inspection.getAssignee() != null) {
            return forbidden("Inspection already taken");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        inspection.setModifierWithDate(user);
        inspection.setAssignee(user);
        inspection.setStartedAt(new Date());
        inspection.update();
        return ok();
    }

    private Optional<Result> checkInspection(LanguageInspection inspection) {
        if (inspection.getStartedAt() == null) {
            return Optional.of(forbidden("Inspection not assigned"));
        }
        if (inspection.getFinishedAt() != null) {
            return Optional.of(forbidden("Inspection already finalized"));
        }
        return Optional.empty();
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setApproval(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        boolean isApproved = Boolean.parseBoolean(df.get("approved"));
        LanguageInspection inspection = DB.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        return checkInspection(inspection).orElseGet(() -> {
                if (inspection.getStatement() == null || inspection.getStatement().getComment().isEmpty()) {
                    return forbidden("No statement given");
                }
                inspection.setFinishedAt(new Date());
                inspection.setApproved(isApproved);

                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                inspection.setModifierWithDate(user);
                inspection.update();

                Set<User> recipients = inspection.getExam().getParent().getExamOwners();
                actor
                    .scheduler()
                    .scheduleOnce(
                        Duration.create(1, TimeUnit.SECONDS),
                        () -> {
                            for (User recipient : recipients) {
                                emailComposer.composeLanguageInspectionFinishedMessage(recipient, user, inspection);
                                logger.info("Language inspection finalization email sent to {}", recipient.getEmail());
                            }
                        },
                        actor.dispatcher()
                    );

                return ok();
            });
    }

    @Authenticated
    @With(CommentSanitizer.class)
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setStatement(Long id, Http.Request request) {
        Optional<String> text = request.attrs().getOptional(Attrs.COMMENT);
        if (text.isEmpty()) {
            return badRequest();
        }
        LanguageInspection inspection = DB.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        return checkInspection(inspection).orElseGet(() -> {
                User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
                Comment statement = inspection.getStatement();
                if (statement == null) {
                    statement = new Comment();
                    statement.setCreatorWithDate(user);
                    statement.save();
                    inspection.setStatement(statement);
                    inspection.update();
                }
                statement.setComment(text.get());
                statement.setModifierWithDate(user);
                statement.update();
                inspection.setModifierWithDate(user);
                inspection.update();
                return ok(inspection);
            });
    }
}
