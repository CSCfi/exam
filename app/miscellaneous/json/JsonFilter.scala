// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.json

import play.api.libs.json.*

object JsonFilter:

  def filter(node: JsValue, ids: Set[Long], properties: Set[String]): JsValue =
    def helper(n: JsValue, isTopLevel: Boolean): JsValue =
      // Filter properties if a) not a top-level node and b) (ids is not empty and id is in ids)
      if ids.nonEmpty && isTopLevel then
        n match
          case obj: JsObject =>
            (obj \ "id").asOpt[Long] match
              case Some(id) if !ids.contains(id) => n
              case _                             => filterObject(obj, properties, isTopLevel)
          case _ => filterValue(n, properties, isTopLevel)
      else filterValue(n, properties, isTopLevel)

    def filterValue(n: JsValue, props: Set[String], topLevel: Boolean): JsValue = n match
      case obj: JsObject => filterObject(obj, props, topLevel)
      case arr: JsArray  => JsArray(arr.value.map(e => helper(e, topLevel)))
      case other         => other

    def filterObject(obj: JsObject, props: Set[String], topLevel: Boolean): JsObject =
      val transformed = obj.fields.foldLeft(Json.obj()) { case (acc, (key, value)) =>
        acc + (key -> helper(value, false))
      }
      props.foldLeft(transformed) { (acc, prop) =>
        acc - prop
      }

    helper(node, isTopLevel = true)
