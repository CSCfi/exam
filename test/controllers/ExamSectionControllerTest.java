// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers;

import static org.fest.assertions.Assertions.assertThat;
import static play.test.Helpers.contentAsString;

import base.IntegrationTestCase;
import base.RunAsTeacher;
import com.fasterxml.jackson.databind.JsonNode;
import io.ebean.DB;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.StreamSupport;
import models.questions.Question;
import models.questions.Tag;
import models.sections.ExamSection;
import models.user.User;
import org.junit.Before;
import org.junit.Test;
import play.libs.Json;
import play.mvc.Result;

public class ExamSectionControllerTest extends IntegrationTestCase {

    private ExamSection section;
    private Tag tag;

    @Before
    public void setUp() throws Exception {
        super.setUp();
        User user = DB.find(User.class, userId);
        section = DB.find(ExamSection.class)
            .findList()
            .stream()
            .filter(s -> !s.getSectionQuestions().isEmpty())
            .findFirst()
            .orElseThrow();
        section.setCreator(user);
        section.update();
        tag = new Tag();
        tag.setName("section-filter");
        tag.setCreatorWithDate(user);
        tag.save();
        Question question = section.getSectionQuestions().iterator().next().getQuestion();
        question.getTags().add(tag);
        question.getQuestionOwners().add(user);
        question.update();
    }

    private Set<Long> listSectionIds(String query) {
        Result result = get("/app/sections?" + query);
        assertThat(result.status()).isEqualTo(200);
        JsonNode node = Json.parse(contentAsString(result));
        return StreamSupport.stream(node.spliterator(), false)
            .map(n -> n.get("id").asLong())
            .collect(Collectors.toSet());
    }

    @Test
    @RunAsTeacher
    public void testListSectionsByTag() {
        assertThat(listSectionIds("tagIds=" + tag.getId())).containsOnly(section.getId());
    }

    @Test
    @RunAsTeacher
    public void testListSectionsByOwner() {
        assertThat(listSectionIds("ownerIds=" + userId)).contains(section.getId());
    }

    @Test
    @RunAsTeacher
    public void testListSectionsByTagAndOwner() {
        assertThat(listSectionIds("tagIds=" + tag.getId() + "&ownerIds=" + userId)).containsOnly(section.getId());
    }
}
