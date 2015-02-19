package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import exceptions.MalformedDataException;
import models.Tag;
import models.questions.AbstractQuestion;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

public class TagController extends SitnetController {

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result listTags() {
        return ok(Json.toJson(Ebean.find(Tag.class)
                .where().eq("creator.id", UserController.getLoggedUser().getId())
                .orderBy("name")
                .findList()));
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result createTag() throws MalformedDataException {
        Tag tag = bindForm(Tag.class);
        SitnetUtil.setCreator(tag);
        SitnetUtil.setModifier(tag);
        tag.save();
        return ok(Json.toJson(tag));
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
        question.getTags().remove(tag);
        question.update();
        return ok();
    }


}