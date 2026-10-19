// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import io.ebean.event.{BeanQueryAdapter, BeanQueryRequest}
import io.ebeaninternal.api.SpiQuery
import play.api.Logging

import scala.jdk.CollectionConverters.*

/** Checks every query's where/having/orderBy paths against the bean descriptor before it runs.
  *
  * Ebean copies an unknown path into the SQL as is, so the failure would otherwise surface as a
  * confusing database error, or not at all if the name happens to match a column. Raw expressions
  * are not checked. Strict (throwing) outside production, see SystemInitializer; production only
  * logs. Registered with Ebean through `ebean.default` in application.conf.
  */
class QueryPathValidator extends BeanQueryAdapter with Logging:
  override def isRegisterFor(cls: Class[?]): Boolean = true
  override def getExecutionOrder: Int                = 0

  override def preQuery(request: BeanQueryRequest[?]): Unit =
    val query = request.query()
    // Ebean's own lazy/secondary/refresh loads (loadMode set) order by raw join columns
    // (e.g. t0.exam_section_question_id for an @OrderBy collection), skip them.
    val internal = query match
      case q: SpiQuery[?] => q.loadMode() != null
      case _              => false
    val unknown = if internal then Nil else query.validate().asScala
    if unknown.nonEmpty then
      val msg =
        s"Unknown property path(s) ${unknown.mkString("[", ", ", "]")} " +
          s"on ${query.getBeanType.getSimpleName}"
      if QueryPathValidator.strict then throw IllegalStateException(msg)
      else logger.warn(msg)

object QueryPathValidator:
  @volatile var strict: Boolean = false
