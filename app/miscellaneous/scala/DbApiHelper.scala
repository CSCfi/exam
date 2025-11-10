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
    def distinct: Set[T]  = el.findSet().asScala.toSet
    def in[C](propertyName: String, values: Iterable[C]): ExpressionList[T] =
      el.in(propertyName, values.toSeq.asJava)

  // This is for IOP with null values coming (especially) from Ebean.
  // Apparently, we can end up having Some(null) if not mapped like this.
  // As a result, we get None as expected.
  extension [T](o: Option[T]) def nonNull: Option[T] = o.flatMap(Option(_))

  extension [T <: Model](q: Query[T])
    def find: Option[T]  = q.findOneOrEmpty().toScala
    def list: List[T]    = q.findList().asScala.toList
    def distinct: Set[T] = q.findSet().asScala.toSet
