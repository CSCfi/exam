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

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsAdmin;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import io.ebean.DB;
import models.Exam;
import models.ExamInspection;
import models.User;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

public class ReviewControllerTest extends IntegrationTestCase {

    private Exam parentExam = null;

    @Before
    public void setUp() throws Exception {
        super.setUp();
        final User user = DB.find(User.class, userId);
        final Exam parent = DB.find(Exam.class).where().eq("name", "Algoritmit, 2013").isNull("parent").findOne();
        assert parent != null;
        final ExamInspection examInspection = new ExamInspection();
        examInspection.setUser(user);
        examInspection.setExam(parent.getChildren().get(0));
        examInspection.save();
        parent.getExamInspections().add(examInspection);
        parent.save();
        this.parentExam = parent;
    }

    @Test
    @RunAsTeacher
    public void getExamReviews() {
        // Execute
        Result result = get("/app/reviews/" + parentExam.getId());

        // Verify
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ArrayNode participationArray = (ArrayNode) node;
        assertThat(participationArray.size()).isEqualTo(1);

        final JsonNode participation = participationArray.get(0);
        final JsonNode examGradeScale = participation.path("exam").path("gradeScale");
        assertThat(examGradeScale).isNotEmpty();
        final JsonNode examGrades = examGradeScale.path("grades");
        assertThat(examGrades.size()).isEqualTo(2);

        final JsonNode courseGradeScale = participation.path("exam").path("course").path("gradeScale");
        assertThat(courseGradeScale).isNotEmpty();
        final JsonNode courseGrades = courseGradeScale.path("grades");
        assertThat(courseGrades.size()).isEqualTo(6);
    }

    @Test
    @RunAsAdmin
    public void getExamReviewsAsAdmin() {
        // Execute
        Result result = get("/app/reviews/" + parentExam.getId());

        // Verify
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        ArrayNode participationArray = (ArrayNode) node;
        assertThat(participationArray.size()).isEqualTo(1);
    }
}
