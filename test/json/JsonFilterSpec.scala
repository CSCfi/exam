// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package json

import miscellaneous.json.JsonFilter
import org.apache.commons.io.FileUtils
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.libs.json.*

import java.io.File
import java.nio.charset.StandardCharsets

class JsonFilterSpec extends AnyWordSpec with Matchers:

  "JsonFilter" when:
    "filtering properties" should:
      "remove specified properties from all JSON objects" in:
        val json = FileUtils.readFileToString(
          new File(getClass.getClassLoader.getResource("jsonfilter_testdata.json").toURI),
          StandardCharsets.UTF_8
        )
        val array = Json.parse(json).as[JsArray]
        val filters = Set("creator", "modifier")

        // Filter json
        val filtered = JsonFilter.filter(array, Set.empty[Long], filters)

        val filteredArray = filtered.as[JsArray]
        val arrayList = filteredArray.value.toList

        // Check that node1 does not have properties
        val node0 = arrayList.head.as[JsObject]
        val node1Item = (node0 \ "item").as[JsObject]
        val node1ItemDesc = (node1Item \ "description").as[JsObject]
        val node1ItemOffers = (node1Item \ "offers").as[JsArray]

        assertThatJsonDoesNotHaveProperties(node0, filters)
        assertThatJsonDoesNotHaveProperties(arrayList(1).as[JsObject], filters)
        assertThatJsonDoesNotHaveProperties(node1Item, filters)
        assertThatJsonDoesNotHaveProperties(node1ItemDesc, filters)

        val offersList = node1ItemOffers.value.toList
        offersList.foreach: offer =>
          assertThatJsonDoesNotHaveProperties(offer.as[JsObject], filters)

      "filter properties with IDs preserving specified objects" in:
        val json = FileUtils.readFileToString(
          new File(getClass.getClassLoader.getResource("jsonfilter_testdata.json").toURI),
          StandardCharsets.UTF_8
        )
        val root = Json.parse(json)
        val filters = Set("creator", "modifier")

        // Filter json
        val ids = Set(2L)
        val filtered = JsonFilter.filter(root, ids, filters)

        val array = filtered.as[JsArray]
        val arrayList = array.value.toList

        val node1 = arrayList.head.as[JsObject]
        val item = (node1 \ "item").as[JsObject]
        val description = (item \ "description").as[JsObject]
        val offers = (item \ "offers").as[JsArray]

        // Check that node1 has still properties
        assertThatJsonHasProperties(node1, filters)
        assertThatJsonHasProperties(item, filters)
        assertThatJsonHasProperties(description, filters)

        val offersList = offers.value.toList
        offersList.foreach: offer =>
          assertThatJsonHasProperties(offer.as[JsObject], filters)

        // Check that node2 does not have properties anymore
        val node2 = arrayList(1).as[JsObject]
        assertThatJsonDoesNotHaveProperties(node2, filters)

  private def assertThatJsonHasProperties(jsonObject: JsObject, props: Set[String]): Unit =
    props.foreach: prop =>
      jsonObject.keys must contain(prop)

  private def assertThatJsonDoesNotHaveProperties(jsonObject: JsObject, props: Set[String]): Unit =
    props.foreach: prop =>
      jsonObject.keys must not contain prop
