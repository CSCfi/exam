package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.text.PathProperties;
import controllers.base.BaseController;
import models.Tag;
import models.User;
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
