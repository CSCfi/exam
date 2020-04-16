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

package backend.controllers.integration;

import backend.controllers.base.BaseController;
import backend.models.ExamRecord;
import backend.models.dto.ExamScore;
import be.objectify.deadbolt.java.actions.SubjectNotPresent;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import io.ebean.Ebean;
import java.util.List;
import java.util.stream.Collectors;
import org.joda.time.DateTime;
import org.joda.time.format.ISODateTimeFormat;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Results;

public class ExamRecordAPIController extends BaseController {
  private static final ObjectMapper SORTED_MAPPER = new ObjectMapper();

  static {
    SORTED_MAPPER.configure(SerializationFeature.ORDER_MAP_ENTRIES_BY_KEYS, true);
  }

  @SubjectNotPresent
  public Result getNewRecords(String startDate) {
    return ok(Json.toJson(getScores(startDate)));
  }

  // for testing purposes
  @SubjectNotPresent
  public Result getNewRecordsAlphabeticKeyOrder(String startDate) {
    try {
      return ok(convertNode(Json.toJson(getScores(startDate))));
    } catch (JsonProcessingException e) {
      return Results.internalServerError(e.getMessage());
    }
  }

  private static List<ExamScore> getScores(String startDate) {
    DateTime start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate);
    List<ExamRecord> examRecords = Ebean
      .find(ExamRecord.class)
      .fetch("examScore")
      .where()
      .gt("timeStamp", start.toDate())
      .findList();
    return examRecords.stream().map(ExamRecord::getExamScore).collect(Collectors.toList());
  }

  private static String convertNode(JsonNode node) throws JsonProcessingException {
    Object obj = SORTED_MAPPER.treeToValue(node, Object.class);
    return SORTED_MAPPER.writeValueAsString(obj);
  }
}
