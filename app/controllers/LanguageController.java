package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Language;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;


public class LanguageController extends SitnetController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getSupportedLanguages() {
        List<Language> languages = Ebean.find(Language.class).findList();
        return ok(Json.toJson(languages));
    }
}