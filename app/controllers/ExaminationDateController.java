package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.Ebean;
import models.Exam;
import models.ExaminationDate;
import org.joda.time.LocalDate;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExaminationDateSanitizer;


public class ExaminationDateController extends BaseController {

    @With(ExaminationDateSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertExaminationDate(Long eid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("exam not found");
        }
        LocalDate date = request().attrs().get(Attrs.DATE);
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
