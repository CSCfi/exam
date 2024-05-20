// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package backend.util;

import static org.fest.assertions.Assertions.assertThat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import miscellaneous.json.JsonFilter;
import org.apache.commons.io.FileUtils;
import org.junit.Test;
import play.libs.Json;
import scala.jdk.javaapi.CollectionConverters;

public class JsonFilterTest {

    @Test
    public void testFilterProperties() throws Exception {
        final String json = FileUtils.readFileToString(
            new File(
                Objects.requireNonNull(getClass().getClassLoader().getResource("jsonfilter_testdata.json")).toURI()
            ),
            "UTF-8"
        );
        final ArrayNode array = (ArrayNode) Json.parse(json);
        final JsonNode node1 = array.get(0);
        final JsonNode item = node1.get("item");
        final JsonNode description = item.get("description");
        final ArrayNode offers = (ArrayNode) item.get("offers");

        final String[] filters = new String[] { "creator", "modifier" };
        assertThatJsonHasProperties(node1, filters);
        assertThatJsonHasProperties(item, filters);
        assertThatJsonHasProperties(description, filters);
        offers.forEach(offer -> assertThatJsonHasProperties(offer, filters));

        // Filter json
        JsonFilter.filterProperties(
            node1,
            CollectionConverters.asScala(Collections.emptySet()).toSet(),
            CollectionConverters.asScala(Arrays.asList(filters)).toSeq()
        );

        // Check that node1 does not have properties
        assertThatJsonDoesNotHaveProperties(node1, filters);
        assertThatJsonDoesNotHaveProperties(item, filters);
        assertThatJsonDoesNotHaveProperties(description, filters);
        offers.forEach(offer -> assertThatJsonDoesNotHaveProperties(offer, filters));
    }

    @Test
    public void testFilterPropertiesWithIds() throws Exception {
        final String json = FileUtils.readFileToString(
            new File(
                Objects.requireNonNull(getClass().getClassLoader().getResource("jsonfilter_testdata.json")).toURI()
            ),
            "UTF-8"
        );
        final JsonNode root = Json.parse(json);

        final String[] filters = new String[] { "creator", "modifier" };

        // Filter json
        final Set<Long> ids = new HashSet<>();
        ids.add(2L);
        JsonFilter.filterProperties(
            root,
            CollectionConverters.asScala(ids).toSet(),
            CollectionConverters.asScala(Arrays.asList(filters)).toSeq()
        );

        final ArrayNode array = (ArrayNode) root;
        final JsonNode node1 = array.get(0);
        final JsonNode item = node1.get("item");
        final JsonNode description = item.get("description");
        final ArrayNode offers = (ArrayNode) item.get("offers");

        // Check that node1 has still properties
        assertThatJsonHasProperties(node1, filters);
        assertThatJsonHasProperties(item, filters);
        assertThatJsonHasProperties(description, filters);
        offers.forEach(offer -> assertThatJsonHasProperties(offer, filters));

        // Check that node2 does not have properties anymore.
        final JsonNode node2 = array.get(1);
        assertThatJsonDoesNotHaveProperties(node2, filters);
    }

    private void assertThatJsonHasProperties(JsonNode jsonNode, String... props) {
        Arrays.asList(props).forEach(p -> assertThat(jsonNode.has(p)).isTrue());
    }

    private void assertThatJsonDoesNotHaveProperties(JsonNode jsonNode, String... props) {
        Arrays.asList(props).forEach(p -> assertThat(jsonNode.has(p)).isFalse());
    }
}
