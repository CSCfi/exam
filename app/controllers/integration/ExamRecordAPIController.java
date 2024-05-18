// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration;

import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import controllers.base.BaseController;
import io.ebean.DB;
import java.util.List;
import models.ExamRecord;
import models.dto.ExamScore;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;

public class ExamRecordAPIController extends BaseController {

    @SubjectNotPresent
    public Result getNewRecords(String startDate) {
        return ok(Json.toJson(getScores(startDate)));
    }

    private List<ExamScore> getScores(String startDate) {
        DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate);
        return DB
            .find(ExamRecord.class)
            .fetch("examScore")
            .where()
            .gt("timeStamp", start)
            .findList()
            .stream()
            .map(ExamRecord::getExamScore)
            .toList();
    }
}
