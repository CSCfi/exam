// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import io.ebean.{ExpressionList, Model, Query}
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import org.joda.time.DateTime

import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.jdk.OptionConverters.*

trait EbeanQueryExtensions:
  // NOTE: When passing a Scala collection to Ebean's .in() or .ine(), always call .asJava on it.
  // Scala 3 resolves member methods before extensions, so Ebean's varargs in(String, Object...)
  // always wins over any extension — the whole Scala collection is passed as a single Object.
  extension [T <: Model](el: ExpressionList[T])
    def find: Option[T]  = el.findOneOrEmpty().toScala
    def list: List[T]    = el.findList().asScala.toList
    def distinct: Set[T] = el.findSet().asScala.toSet

    /** Keyset condition for rows after `key` in `orderBy(s"$prop, id")` order (see keysetPages).
      * The redundant `ge` is what an index on `prop` can seek on; with the `or` alone Postgres
      * scans the index from the beginning on every page.
      */
    def after(prop: String, key: Option[(DateTime, Long)]): ExpressionList[T] =
      key.fold(el) { (time, id) =>
        el.ge(prop, time.toDate)
          .or()
          .gt(prop, time.toDate)
          .and()
          .eq(prop, time.toDate)
          .gt("id", id)
          .endAnd()
          .endOr()
      }

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

  /** Streams query results in keyset pages, for responses too large to hold in memory. Each page is
    * fetched on `ec` only when the stream is pulled, and its own query and persistence context
    * become garbage once the page has been passed on.
    *
    * `fetch` gets the key of the last row of the previous page (None for the first page) and must
    * return at most `pageSize` rows ordered by that key. `process` runs on each raw page after the
    * next key has been taken, so it may drop rows (in-memory filters, duplicates) without ending
    * the stream early.
    *
    * Example:
    * {{{
    *   keysetPages(1000, (r: ExamRecord) => r.id.longValue)(after =>
    *     after.fold(query)(id => query.gt("id", id)).orderBy("id").setMaxRows(1000).list
    *   )(identity)
    * }}}
    */
  def keysetPages[T, K, U](pageSize: Int, key: T => K)(fetch: Option[K] => List[T])(
      process: List[T] => List[U]
  )(using ec: ExecutionContext): Source[List[U], NotUsed] =
    // State: None when done, otherwise the key of the last row fetched (None at first)
    Source.unfoldAsync(Option(Option.empty[K])) {
      case None => Future.successful(None)
      case Some(after) =>
        Future {
          val rows = fetch(after)
          val next = if rows.size < pageSize then None else Some(rows.lastOption.map(key))
          if rows.isEmpty then None else Some((next, process(rows)))
        }
    }
