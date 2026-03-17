// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import io.ebean.{ExpressionList, Model, Query}

import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

trait EbeanQueryExtensions:
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

  /** Splits a known set of IDs into batches and issues one DB query per batch. Each batch is
    * fetched lazily, so only one batch is in memory at a time when consumed with foreach/map rather
    * than toList.
    *
    * Example:
    * {{{
    *   childIds.inBatches(50) { batchIds =>
    *     DB.find(classOf[Exam]).fetch("sections").where().in("id", batchIds).list
    *   }
    * }}}
    */
  extension [A](ids: List[A])
    def inBatches[T](batchSize: Int)(fetch: List[A] => List[T]): LazyList[List[T]] =
      LazyList.from(ids.grouped(batchSize).map(fetch))

  /** Fetches rows page by page using LIMIT/OFFSET until an empty page is returned. Each page is
    * fetched lazily, so only one page is in memory at a time when consumed with foreach/map rather
    * than toList.
    *
    * Note: LIMIT/OFFSET pagination may produce duplicate or missing rows if the underlying data
    * changes between page fetches. Suitable for point-in-time exports.
    *
    * Example:
    * {{{
    *   inPages(200) { (offset, limit) =>
    *     DB.find(classOf[ExamParticipation])
    *       .where()
    *       .gt("started", start)
    *       .setFirstRow(offset)
    *       .setMaxRows(limit)
    *       .list
    *   }
    * }}}
    */
  def inPages[T](pageSize: Int)(fetch: (Int, Int) => List[T]): LazyList[List[T]] =
    LazyList.unfold(0) { offset =>
      val page = fetch(offset, pageSize)
      if page.isEmpty then None
      else Some((page, offset + pageSize))
    }
