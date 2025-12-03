// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.json

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ObjectNode

import scala.jdk.CollectionConverters._

object JsonFilter:
  // TODO: make immutable
  def filterProperties(node: JsonNode, ids: Set[Long], properties: String*): Unit =
    def helper(acc: JsonNode): Unit =
      if ids.isEmpty || !acc.has("id") || ids.contains(acc.get("id").asLong) then
        (if acc.isObject then acc.asInstanceOf[ObjectNode].remove(properties.asJava) else acc).elements.asScala
          .foreach(helper)

    helper(node)
