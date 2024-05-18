// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.List;
import models.Language;
import play.libs.Json;
import play.mvc.Result;

public class LanguageController extends BaseController {

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    public Result getSupportedLanguages() {
        List<Language> languages = DB.find(Language.class).findList();
        return ok(Json.toJson(languages));
    }
}
