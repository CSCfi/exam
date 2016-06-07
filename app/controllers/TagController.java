package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import models.Tag;
import models.User;
import models.questions.Question;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

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
        return ok(Json.toJson(tags));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result createTag() {
        Tag tag = bindForm(Tag.class);
        User user = getLoggedUser();
        AppUtil.setCreator(tag, user);
        AppUtil.setModifier(tag, user);
        String name = tag.getName().toLowerCase();
        // Save only if not already exists
        Tag existing = Ebean.find(Tag.class).where()
                .eq("name", name)
                .eq("creator.id", tag.getCreator().getId())
                .findUnique();
        if (existing == null) {
            tag.setName(name);
            tag.save();
            return created(Json.toJson(tag));
        } else {
            return ok(Json.toJson(existing));
        }
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result deleteTag(Long tagId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        if (tag == null) {
            return notFound();
        }
        tag.delete();
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result tagQuestion(Long tagId, Long questionId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        Question question = Ebean.find(Question.class, questionId);
        if (tag == null || question == null) {
            return notFound();
        }
        Set<String> names = question.getTags().stream().map(Tag::getName).collect(Collectors.toSet());
        if (!names.contains(tag.getName())) {
            question.getTags().add(tag);
            question.update();
        }
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result untagQuestion(Long tagId, Long questionId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        Question question = Ebean.find(Question.class, questionId);
        if (tag == null || question == null) {
            return notFound();
        }
        question.getTags().remove(tag);
        question.update();

        return ok();
    }


}
