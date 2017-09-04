package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import com.fasterxml.jackson.databind.JsonNode;
import controllers.base.BaseController;
import models.Exam;
import models.ExaminationDate;
import org.joda.time.LocalDate;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;


public class ExaminationDateController extends BaseController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertExaminationDate(Long eid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("exam not found");
        }
        JsonNode body = request().body().asJson();
        LocalDate date = LocalDate.parse(body.get("date").asText(), ISODateTimeFormat.dateTimeParser());
        ExaminationDate ed = new ExaminationDate();
        ed.setDate(date.toDate());
        ed.setExam(exam);
        ed.save();
        return ok(ed);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeExaminationDate(Long id, Long edid) {

        ExaminationDate ed = Ebean.find(ExaminationDate.class, edid);
        if (ed == null) {
            return notFound("examination date not found");
        }
        ed.delete();
        return ok();
    }


}
