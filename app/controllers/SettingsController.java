package controllers;

import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Update;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.GeneralSettings;
import models.User;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;

import java.util.List;

/**
 * Created by avainik on 8/15/14.
 */
public class SettingsController  extends SitnetController {

    @Restrict({ @Group("ADMIN"), @Group("STUDENT")})
    public static Result getUserAgreement() {

        /*
        GeneralSettings agreament = Ebean.find(GeneralSettings.class, 1);
        */

        // Get the only row.
        List<GeneralSettings> gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList();
        return ok(Json.toJson(gs.get(0)));
    }

    @Restrict({ @Group("ADMIN")})
    public static Result updateUserAgreement() throws MalformedDataException {
/*
        GeneralSettings gs = bindForm(GeneralSettings.class);
        gs.update();
*/
        DynamicForm df = Form.form().bindFromRequest();
        String eula = df.get("eula");
        GeneralSettings gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList().get(0);
        gs.setEula(eula);
        gs.update();

        // Since the EULA has changed, force users to accept it again.
        String updStatement = "update sitnet_users set has_accepted_user_agreament = :hasNot";

        Update<User> update = Ebean.createUpdate(User.class, updStatement);

        update.set("hasNot", false);

        update.execute();

        return ok(Json.toJson(gs));
    }
    @Restrict({ @Group("ADMIN")})
    public static Result updateSettings() throws MalformedDataException {

        /*GeneralSettings gs = bindForm(GeneralSettings.class);
        gs.update();
        */
        DynamicForm df = Form.form().bindFromRequest();
        long deadline = Long.valueOf(df.get("reviewDeadline"));


        GeneralSettings gs = Ebean.find(GeneralSettings.class).setMaxRows(1).findList().get(0);

        gs.setReviewDeadline(deadline);
        gs.update();

        return ok(Json.toJson(gs));
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("STUDENT")})
    public static Result getHostname() {
        ObjectNode node = Json.newObject();
        node.put("hostname", SitnetUtil.getHostName());
        return ok(Json.toJson(node));
    }
}
