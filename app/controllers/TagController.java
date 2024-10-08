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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.StreamSupport;
import models.Role;
import models.Tag;
import models.User;
import models.questions.Question;
import play.mvc.Http;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;

public class TagController extends BaseController {

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result listTags(
        Optional<String> filter,
        Optional<List<Long>> courseIds,
        Optional<List<Long>> examIds,
        Optional<List<Long>> sectionIds,
        Optional<List<Long>> ownerIds,
        Http.Request request
    ) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Tag> query = DB.find(Tag.class).where();
        if (!user.hasRole(Role.Name.ADMIN)) {
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

    @Restrict({ @Group("ADMIN"), @Group("TEACHER") })
    public Result addTagToQuestions(Http.Request request) {
        JsonNode body = request.body().asJson();
        List<Long> questionIds = StreamSupport
            .stream(body.get("questionIds").spliterator(), false)
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
