// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.{ExpressionList, Model, Query}

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

trait DbApiHelper:
  extension [T <: Model](el: ExpressionList[T])
    def find: Option[T]  = el.findOneOrEmpty().toScala
    def list: List[T]    = el.findList().asScala.toList
    def distinct: Set[T] = el.findSet().asScala.toSet
    def in[C](propertyName: String, values: Iterable[C]): ExpressionList[T] =
      el.in(propertyName, values.toSeq.asJava)

  extension [T <: Model](q: Query[T])
    def find: Option[T]  = q.findOneOrEmpty().toScala
    def list: List[T]    = q.findList().asScala.toList
    def distinct: Set[T] = q.findSet().asScala.toSet
