package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import exceptions.MalformedDataException;
import models.Tag;
import models.User;
import models.questions.AbstractQuestion;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.util.List;

public class TagController extends SitnetController {

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result listTags(F.Option<String> filter) {
        User user = UserController.getLoggedUser();
        ExpressionList<Tag> query = Ebean.find(Tag.class).where();
        if (!user.hasRole("ADMIN")) {
            query = query.where().eq("creator.id", user.getId());
        }
        if (filter.isDefined()) {
            String condition = String.format("%%%s%%", filter.get());
            query = query.ilike("name", condition);
        }
        List<Tag> tags = query.orderBy("name").findList();
        return ok(Json.toJson(tags));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result createTag() throws MalformedDataException {
        Tag tag = bindForm(Tag.class);
        SitnetUtil.setCreator(tag);
        SitnetUtil.setModifier(tag);
        // Save only if not already exists
        Tag existing = Ebean.find(Tag.class).where().eq("name", tag.getName())
                .eq("creator.id", tag.getCreator().getId()).findUnique();
        if (existing == null) {
            tag.save();
            return created(Json.toJson(tag));
        } else {
            return ok(Json.toJson(existing));
        }
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result deleteTag(Long tagId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        if (tag == null) {
            return notFound();
        }
        tag.delete();
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result tagQuestion(Long tagId, Long questionId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, questionId);
        if (tag == null || question == null) {
            return notFound();
        }
        if (question.getParent() != null) {
            return forbidden("Tagging is available only for prototype questions");
        }
        question.getTags().add(tag);
        question.update();
        return ok();
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result untagQuestion(Long tagId, Long questionId) {
        Tag tag = Ebean.find(Tag.class, tagId);
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, questionId);
        if (tag == null || question == null) {
            return notFound();
        }
        if (question.getParent() != null) {
            return forbidden("Tagging is available only for prototype questions");
        }
        question.getTags().remove(tag);
        question.update();

        return ok();
    }


}