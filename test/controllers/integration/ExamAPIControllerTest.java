// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.DB;
import java.util.List;
import java.util.Optional;
import models.Exam;
import models.ExamExecutionType;
import org.joda.time.DateTime;
import org.joda.time.LocalDateTime;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;
import play.test.Helpers;

public class ExamAPIControllerTest extends IntegrationTestCase {

    private List<Exam> exams;
    private ExamExecutionType publicType;
    private ExamExecutionType privateType;

    @Before
    public void setUp() throws Exception {
        super.setUp();
        final List<ExamExecutionType> types = DB.find(ExamExecutionType.class).findList();
        publicType = findType(types, ExamExecutionType.Type.PUBLIC).orElse(null);
        privateType = findType(types, ExamExecutionType.Type.PRIVATE).orElse(null);

        final LocalDateTime startDate = LocalDateTime.now().plusDays(1);
        final LocalDateTime endDate = LocalDateTime.now().plusDays(10);
        exams = DB.find(Exam.class).findList();
        // Set all exams to start on future
        exams.forEach(e -> {
            e.setState(Exam.State.PUBLISHED);
            e.setPeriodStart(startDate.toDateTime());
            e.setPeriodEnd(endDate.toDateTime());
            e.setExecutionType(publicType);
            e.save();
        });
    }

    @Test
    public void testGetActiveExams() {
        // Pick first exam and set it already started but not yet ended (included)
        final Exam first = exams.get(0);
        first.setPeriodStart(LocalDateTime.now().minusDays(1).toDateTime());
        first.save();

        // Set second exam already ended (excluded)
        final Exam second = exams.get(1);
        second.setPeriodStart(LocalDateTime.now().minusDays(2).toDateTime());
        second.setPeriodEnd(LocalDateTime.now().minusDays(1).toDateTime());
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
        records
            .elements()
            .forEachRemaining(n ->
                assertThat(n.get("id").asLong()).isNotIn(second.getId(), third.getId(), fourth.getId())
            );

        String filter = DateTime.now().minusDays(3).toString("yyyy-MM-dd");
        result = get("/integration/exams/active?date=" + filter);
        assertThat(result.status()).isEqualTo(200);
        node = Json.parse(contentAsString(result));
        assertThat(node.isArray()).isTrue();
        records = (ArrayNode) node;
        assertThat(records.size()).isEqualTo(exams.size() - 2);
        records
            .elements()
            .forEachRemaining(n -> assertThat(n.get("id").asLong()).isNotIn(third.getId(), fourth.getId()));
    }

    private Optional<ExamExecutionType> findType(List<ExamExecutionType> types, ExamExecutionType.Type type) {
        return types
            .stream()
            .filter(examExecutionType -> examExecutionType.getType().equals(type.toString()))
            .findFirst();
    }
}
