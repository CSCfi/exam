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
