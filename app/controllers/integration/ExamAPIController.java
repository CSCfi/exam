/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package controllers.integration;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Optional;
import models.Exam;
import models.ExamExecutionType;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.mvc.Result;

public class ExamAPIController extends BaseController {

    @SubjectNotPresent
    public Result getActiveExams(Optional<String> date) {
        PathProperties pp = PathProperties.parse(
            "(course(name, code, credits, " +
            "gradeScale(description, externalRef, displayName), organisation(code, name, nameAbbreviation)) " +
            "id, name, periodStart, periodEnd, duration, enrollInstruction, " +
            "examLanguages(code, name), gradeScale(description, externalRef, displayName), " +
            "examOwners(firstName, lastName, email), examType(type)" +
            ")"
        );
        DateTime dateTime = date.isPresent()
            ? ISODateTimeFormat.dateTimeParser().parseDateTime(date.get())
            : DateTime.now();
        Query<Exam> query = DB.find(Exam.class);
        query.apply(pp);
        List<Exam> exams = query
            .where()
            .eq("state", Exam.State.PUBLISHED)
            .ge("periodEnd", dateTime)
            .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString())
            .findList();

        return ok(exams, pp);
    }
}
