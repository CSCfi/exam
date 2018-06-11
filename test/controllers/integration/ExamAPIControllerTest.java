/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package controllers.integration;

import base.IntegrationTestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.Ebean;
import backend.models.Exam;
import backend.models.ExamExecutionType;
import org.joda.time.DateTime;
import org.joda.time.LocalDateTime;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

import java.util.List;
import java.util.Optional;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

public class ExamAPIControllerTest extends IntegrationTestCase {

    private List<Exam> exams;
    private ExamExecutionType publicType;
    private ExamExecutionType privateType;

    @Before
    public void setUp() throws Exception {
        super.setUp();
        final List<ExamExecutionType> types = Ebean.find(ExamExecutionType.class).findList();
        publicType = findType(types, ExamExecutionType.Type.PUBLIC).orElse(null);
        privateType = findType(types, ExamExecutionType.Type.PRIVATE).orElse(null);

        final LocalDateTime startDate = LocalDateTime.now().plusDays(1);
        final LocalDateTime endDate = LocalDateTime.now().plusDays(10);
        exams = Ebean.find(Exam.class).findList();
        // Set all exams to start on future
        exams.forEach(e -> {
            e.setState(Exam.State.PUBLISHED);
            e.setExamActiveStartDate(startDate.toDateTime());
            e.setExamActiveEndDate(endDate.toDateTime());
            e.setExecutionType(publicType);
            e.save();
        });
    }

    @Test
    public void testGetActiveExams() {
        // Pick first exam and set it already started but not yet ended (included)
        final Exam first = exams.get(0);
        first.setExamActiveStartDate(LocalDateTime.now().minusDays(1).toDateTime());
        first.save();

        // Set second exam already ended (excluded)
        final Exam second = exams.get(1);
        second.setExamActiveStartDate(LocalDateTime.now().minusDays(2).toDateTime());
        second.setExamActiveEndDate(LocalDateTime.now().minusDays(1).toDateTime());
        second.save();

        // Set third exam as private (excluded)
        final Exam third = exams.get(2);
        third.setExecutionType(privateType);
        third.save();

        // Set fourth exam not published (excluded)
        final Exam fourth = exams.get(3);
        fourth.setState(Exam.State.DRAFT);
        fourth.save();

        // Execute
        Result result = request(Helpers.GET, "/integration/exams/active", null);
        assertThat(result.status()).isEqualTo(200);

        JsonNode node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        ArrayNode records = (ArrayNode) node;
        assertThat(records).hasSize(exams.size() - 3);
        records.elements().forEachRemaining(n ->
                assertThat(n.get("id").asLong()).isNotIn(second.getId(), third.getId(), fourth.getId()));

        String filter = DateTime.now().minusDays(3).toString("yyyy-MM-dd");
        result = get("/integration/exams/active?date=" + filter);
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        records = (ArrayNode) node;
        assertThat(records.size()).isEqualTo(exams.size() - 2);
        records.elements().forEachRemaining(n ->
                assertThat(n.get("id").asLong()).isNotIn(third.getId(), fourth.getId()));
    }

    private Optional<ExamExecutionType> findType(List<ExamExecutionType> types, ExamExecutionType.Type type) {
        return types.stream()
                .filter(examExecutionType ->
                        examExecutionType.getType().equals(type.toString()))
                .findFirst();
    }
}