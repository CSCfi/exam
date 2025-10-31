// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.json

import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import com.fasterxml.jackson.databind.node.{ArrayNode, ObjectNode}
import scala.jdk.CollectionConverters.*

object JsonFilter:
  private val mapper = new ObjectMapper()

  def filter(node: JsonNode, ids: Set[Long], properties: Set[String]): JsonNode =
    def helper(n: JsonNode, isTopLevel: Boolean): JsonNode =
      // Filter properties if a) not a top-level node and b) (ids is not empty and id is in ids)
      if ids.nonEmpty && isTopLevel && n.has("id") && !ids.contains(n.get("id").asLong) then n
      else
        n match
          case obj: ObjectNode =>
            val transformed = obj.properties().asScala.foldLeft(mapper.createObjectNode()) { (acc, entry) =>
              acc.set(entry.getKey, helper(entry.getValue, false))
            }
            properties.foldLeft(transformed) { (acc, p) =>
              acc.remove(p)
              acc
            }
          case arr: ArrayNode =>
            val newArr = mapper.createArrayNode()
            // Elements of root array are considered top-level
            arr.elements.asScala.foreach { e =>
              newArr.add(helper(e, isTopLevel))
            }
            newArr

          case other => other

    // const filtered = node.filter(n => ids.isEmpty || ids.has(n.id))
    // helper(filtered)
    helper(node, isTopLevel = true)
