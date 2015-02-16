package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Tag;
import play.libs.Json;
import play.mvc.Controller;
import play.mvc.Result;

public class TagController extends Controller {

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public static Result listTags() {
        return ok(Json.toJson(Ebean.find(Tag.class).orderBy("name").findList()));
    }

}