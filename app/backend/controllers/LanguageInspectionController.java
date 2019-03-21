/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers;

import java.util.Date;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Dynamic;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.mvc.Http;
import play.mvc.Result;
import scala.concurrent.duration.Duration;

import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.models.Comment;
import backend.models.Exam;
import backend.models.LanguageInspection;
import backend.models.User;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.AppUtil;


public class LanguageInspectionController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    private static final Logger.ALogger logger = Logger.of(LanguageInspectionController.class);

    @Dynamic(value = "inspector or admin", meta = "pattern=CAN_INSPECT_LANGUAGE,role=ADMIN,anyMatch=true")
    public Result listInspections(Optional<String> month, Optional<Long> start, Optional<Long> end) {
        ExpressionList<LanguageInspection> query = Ebean.find(LanguageInspection.class)
                .fetch("exam")
                .fetch("exam.course")
                .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
                .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
                .fetch("statement")
                .fetch("creator", "firstName, lastName, email, userIdentifier")
                .fetch("assignee", "firstName, lastName, email, userIdentifier")
                .where()
                .ne("exam.state", Exam.State.DELETED);

        if (start.isPresent() || end.isPresent()) {
            if (start.isPresent()) {
                DateTime startDate = new DateTime(start.get()).withTimeAtStartOfDay();
                query = query.ge("finishedAt", startDate.toDate());
            }

            if (end.isPresent()) {
                DateTime endDate = new DateTime(end.get()).plusDays(1).withTimeAtStartOfDay();
                query = query.lt("finishedAt", endDate.toDate());
            }
        } else if (month.isPresent()) {
            DateTime startWithMonth = DateTime.parse(month.get()).withDayOfMonth(1).withMillisOfDay(0);
            DateTime endWithMonth = startWithMonth.plusMonths(1);
            query = query.between("finishedAt", startWithMonth.toDate(), endWithMonth.toDate());
        }

        return ok(query.findSet());
    }

    @Authenticated
    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result createInspection(Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
        Long examId = Long.parseLong(df.get("examId"));
        Exam exam = Ebean.find(Exam.class, examId);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.getLanguageInspection() != null) {
            return forbidden("already sent for inspection");
        }
        if (!exam.getSubjectToLanguageInspection()) {
            return forbidden("not allowed to send for inspection");
        }
        LanguageInspection inspection = new LanguageInspection();
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        AppUtil.setCreator(inspection, user);
        inspection.setExam(exam);
        inspection.save();
        return ok();
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result assignInspection(Long id, Http.Request request) {
        LanguageInspection inspection = Ebean.find(LanguageInspection.class, id);
        if (inspection == null) {
            return notFound("Inspection not found");
        }
        if (inspection.getAssignee() != null) {
            return forbidden("Inspection already taken");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        AppUtil.setModifier(inspection, user);
        inspection.setAssignee(user);
        inspection.setStartedAt(new Date());
        inspection.update();
        return ok();
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setApproval(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
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

        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        AppUtil.setModifier(inspection, user);
        inspection.update();

        Set<User> recipients = inspection.getExam().getParent().getExamOwners();
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User recipient : recipients) {
                emailComposer.composeLanguageInspectionFinishedMessage(recipient, user, inspection);
                logger.info("Language inspection finalization email sent to {}", recipient.getEmail());
            }
        }, actor.dispatcher());

        return ok();
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result setStatement(Long id, Http.Request request) {
        DynamicForm df = formFactory.form().bindFromRequest(request);
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
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
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
        return ok(inspection);
    }

}
