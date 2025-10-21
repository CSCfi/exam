// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.List;
import java.util.Optional;
import models.exam.Exam;
import models.exam.ExamExecutionType;
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
