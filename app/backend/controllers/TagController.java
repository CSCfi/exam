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

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.text.PathProperties;
import backend.controllers.base.BaseController;
import backend.models.Tag;
import backend.models.User;
import play.mvc.Result;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public class TagController extends BaseController {

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result listTags(Optional<String> filter, Optional<List<Long>> examIds, Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds) {
        User user = getLoggedUser();
        ExpressionList<Tag> query = Ebean.find(Tag.class).where();
        if (!user.hasRole("ADMIN", getSession())) {
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
        Set<Tag> tags = query.findSet();
        return ok(tags, PathProperties.parse("(*, creator(id))"));
    }

}
