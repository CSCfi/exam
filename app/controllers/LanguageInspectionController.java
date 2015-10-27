package controllers;

import be.objectify.deadbolt.java.actions.Pattern;
import com.avaje.ebean.Ebean;
import models.LanguageInspection;
import org.joda.time.DateTime;
import play.mvc.Result;

import java.util.List;


public class LanguageInspectionController extends BaseController {

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result listInspections() {
        DateTime beginningOfYear = DateTime.now().withDayOfYear(1);
        List<LanguageInspection> inspections = Ebean.find(LanguageInspection.class)
                .fetch("exam")
                .fetch("exam.course")
                .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
                .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
                .fetch("statement")
                .fetch("creator", "firstName, lastName, email, userIdentifier")
                .fetch("assignee", "firstName, lastName, email, userIdentifier")
                .where()
                .disjunction()
                .isNull("finishedAt")
                .gt("finishedAt", beginningOfYear.toDate())
                .endJunction()
                .findList();
        return ok(inspections);
    }

}
