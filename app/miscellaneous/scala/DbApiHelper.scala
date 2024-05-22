// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.{ExpressionList, Model}

import scala.jdk.CollectionConverters._
import scala.jdk.OptionConverters._

trait DbApiHelper:
  extension [T <: Model](el: ExpressionList[T])
    def find: Option[T]  = el.findOneOrEmpty().toScala
    def list: List[T]    = el.findList().asScala.toList
    def distinct: Set[T] = el.findSet().asScala.toSet

  // This is for IOP with null values coming (especially) from Ebean.
  // Apparently we can end up having Some(null) if not mapped like this.
  // As a result we get None as expected.
  extension [T](o: Option[T]) def nonNull: Option[T] = o.flatMap(Option(_))
