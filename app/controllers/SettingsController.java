package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.*;
import play.libs.Json;
import play.mvc.Result;

/**
 * Created by avainik on 8/15/14.
 */
public class SettingsController  extends SitnetController {

    @Restrict({ @Group("ADMIN")})
    public static Result getUserAgreament() {

        GeneralSettings agreament = Ebean.find(GeneralSettings.class, 1);

        return ok(Json.toJson(agreament));
    }

   @Restrict({ @Group("ADMIN")})
    public static Result getUserAgreamentX(Long id) {

        GeneralSettings agreament = Ebean.find(GeneralSettings.class, id);

        return ok(Json.toJson(agreament));
    }

    @Restrict({ @Group("ADMIN")})
    public static Result updateUserAgreament(Long id) throws MalformedDataException {

        GeneralSettings agreament = bindForm(GeneralSettings.class);
        agreament.update();

        return ok(Json.toJson(agreament));
    }



}
