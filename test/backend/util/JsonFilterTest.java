// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package backend.util;

import static org.fest.assertions.Assertions.assertThat;

import java.io.File;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.Objects;
import java.util.Set;
import miscellaneous.json.JsonFilter;
import org.apache.commons.io.FileUtils;
import org.junit.Test;
import play.api.libs.json.JsArray;
import play.api.libs.json.JsObject;
import play.api.libs.json.JsValue;
import play.api.libs.json.Json;
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
        final JsArray array = (JsArray) Json.parse(json);
        final String[] filters = new String[] { "creator", "modifier" };

        // Filter json
        JsValue filtered = JsonFilter.filter(
            array,
            CollectionConverters.asScala(Collections.emptySet()).toSet(),
            CollectionConverters.asScala(Arrays.asList(filters)).toSet()
        );

        JsArray filteredArray = (JsArray) filtered;
        // Convert to a Java list for easier access
        java.util.List<JsValue> arrayList = CollectionConverters.asJava(filteredArray.value());

        // Check that node1 does not have properties
        JsObject node0 = (JsObject) arrayList.getFirst();
        JsObject node1Item = (JsObject) node0.value().get("item").get();
        JsObject node1ItemDesc = (JsObject) node1Item.value().get("description").get();
        JsArray node1ItemOffers = (JsArray) node1Item.value().get("offers").get();

        assertThatJsonDoesNotHaveProperties(node0, filters);
        assertThatJsonDoesNotHaveProperties((JsObject) arrayList.get(1), filters);
        assertThatJsonDoesNotHaveProperties(node1Item, filters);
        assertThatJsonDoesNotHaveProperties(node1ItemDesc, filters);

        java.util.List<JsValue> offersList = CollectionConverters.asJava(node1ItemOffers.value());
        offersList.forEach(offer -> assertThatJsonDoesNotHaveProperties((JsObject) offer, filters));
    }

    @Test
    public void testFilterPropertiesWithIds() throws Exception {
        final String json = FileUtils.readFileToString(
            new File(
                Objects.requireNonNull(getClass().getClassLoader().getResource("jsonfilter_testdata.json")).toURI()
            ),
            "UTF-8"
        );
        final JsValue root = Json.parse(json);

        final String[] filters = new String[] { "creator", "modifier" };

        // Filter json
        final Set<Long> ids = new HashSet<>();
        ids.add(2L);
        JsValue filtered = JsonFilter.filter(
            root,
            CollectionConverters.asScala(ids).toSet(),
            CollectionConverters.asScala(Arrays.asList(filters)).toSet()
        );

        final JsArray array = (JsArray) filtered;
        java.util.List<JsValue> arrayList = CollectionConverters.asJava(array.value());

        final JsObject node1 = (JsObject) arrayList.getFirst();
        final JsObject item = (JsObject) node1.value().get("item").get();
        final JsObject description = (JsObject) item.value().get("description").get();
        final JsArray offers = (JsArray) item.value().get("offers").get();

        // Check that node1 has still properties
        assertThatJsonHasProperties(node1, filters);
        assertThatJsonHasProperties(item, filters);
        assertThatJsonHasProperties(description, filters);

        java.util.List<JsValue> offersList = CollectionConverters.asJava(offers.value());
        offersList.forEach(offer -> assertThatJsonHasProperties((JsObject) offer, filters));

        // Check that node2 does not have properties anymore.
        final JsObject node2 = (JsObject) arrayList.get(1);
        assertThatJsonDoesNotHaveProperties(node2, filters);
    }

    private void assertThatJsonHasProperties(JsObject jsonObject, String... props) {
        Arrays.asList(props).forEach(p -> assertThat(jsonObject.keys().contains(p)).isTrue());
    }

    private void assertThatJsonDoesNotHaveProperties(JsObject jsonObject, String... props) {
        Arrays.asList(props).forEach(p -> assertThat(jsonObject.keys().contains(p)).isFalse());
    }
}
