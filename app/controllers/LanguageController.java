package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import controllers.base.BaseController;
import models.Language;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;


public class LanguageController extends BaseController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getSupportedLanguages() {
        List<Language> languages = Ebean.find(Language.class).findList();
        return ok(Json.toJson(languages));
    }
}
