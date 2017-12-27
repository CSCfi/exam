/*
 * Copyright (c) 2017 Exam Consortium
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

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
