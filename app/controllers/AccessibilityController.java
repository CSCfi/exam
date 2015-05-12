package controllers;

import exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Accessibility;
import models.ExamRoom;
import play.libs.Json;
import play.mvc.Result;

import java.util.List;


public class AccessibilityController extends SitnetController {

    @Restrict({@Group("ADMIN")})
    public static Result addAccessibility() throws MalformedDataException {
        Accessibility accessibility = bindForm(Accessibility.class);
        accessibility.save();
        return ok(Json.toJson(accessibility));
    }

    @Restrict({@Group("ADMIN")})
    public static Result updateAccessibility() throws MalformedDataException {
        Accessibility accessibility = bindForm(Accessibility.class);
        accessibility.update();
        return ok(Json.toJson(accessibility));
    }

    @Restrict({@Group("ADMIN")})
    public static Result removeAccessibility(Long id) {
        Accessibility accessibility = Ebean.find(Accessibility.class, id);

        if(accessibility == null) {
            return notFound();
        }

        List<ExamRoom> examRooms = Ebean.find(ExamRoom.class)
                .where()
                .in("accessibility", accessibility)
                .findList();

        if(examRooms != null) {
            for(ExamRoom examRoom : examRooms) {
                examRoom.getAccessibility().remove(accessibility);
                examRoom.update();
            }
        }
        accessibility.delete();

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result getAccessibilities() {
        List<Accessibility> accessibilities = Ebean.find(Accessibility.class).findList();
        return ok(Json.toJson(accessibilities));
    }
}