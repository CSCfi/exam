// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.question;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.StreamSupport;
import models.questions.Question;
import models.questions.Tag;
import models.user.Role;
import models.user.User;
import play.mvc.Http;
import play.mvc.Result;
import security.Authenticated;
import validation.java.core.Attrs;

public class TagController extends BaseController {

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result listTags(
        Optional<String> filter,
        Optional<List<Long>> courseIds,
        Optional<List<Long>> examIds,
        Optional<List<Long>> sectionIds,
        Optional<List<Long>> ownerIds,
        Http.Request request
    ) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        var query = DB.find(Tag.class).where();
        if (!user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
            query = query.where().eq("creator.id", user.getId());
        }
        if (filter.isPresent()) {
            String condition = String.format("%%%s%%", filter.get());
            query = query.ilike("name", condition);
        }
        if (examIds.isPresent() && !examIds.get().isEmpty()) {
            query = query.in("questions.examSectionQuestions.examSection.exam.id", examIds.get());
        }
        if (courseIds.isPresent() && !courseIds.get().isEmpty()) {
            query = query.in("questions.examSectionQuestions.examSection.exam.course.id", courseIds.get());
        }
        if (sectionIds.isPresent() && !sectionIds.get().isEmpty()) {
            query = query.in("questions.examSectionQuestions.examSection.id", sectionIds.get());
        }
        if (ownerIds.isPresent() && !ownerIds.get().isEmpty()) {
            query = query.in("questions.questionOwners.id", ownerIds.get());
        }
        Set<Tag> tags = query.findSet();
        return ok(tags, PathProperties.parse("(*, creator(id), questions(id))"));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result addTagToQuestions(Http.Request request) {
        JsonNode body = request.body().asJson();
        List<Long> questionIds = StreamSupport.stream(body.get("questionIds").spliterator(), false)
            .map(JsonNode::asLong)
            .toList();
        Long tagId = body.get("tagId").asLong();
        List<Question> questions = DB.find(Question.class).where().idIn(questionIds).findList();
        Tag tag = DB.find(Tag.class, tagId);
        questions.forEach(question -> {
            if (!question.getTags().contains(tag)) {
                question.getTags().add(tag);
                question.update();
            }
        });
        return ok();
    }
}
