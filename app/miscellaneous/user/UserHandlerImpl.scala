// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.user

import io.ebean.ExpressionList

class UserHandlerImpl extends UserHandler:

  override def applyNameSearch[T](prefix: String, query: ExpressionList[T], filter: String): ExpressionList[T] =
    val rawFilter = filter.replaceAll(" +", " ").trim
    val fnField   = Option(prefix).map(p => s"$p.firstName").getOrElse("firstName")
    val lnField   = Option(prefix).map(p => s"$p.lastName").getOrElse("lastName")

    rawFilter.split(" ").toList match
      case name1 :: name2 :: _ =>
        // User provided two names - try combinations of first and last names
        query
          .or()
          .and()
          .ilike(fnField, s"%$name1%")
          .ilike(lnField, s"%$name2%")
          .endAnd()
          .and()
          .ilike(fnField, s"%$name2%")
          .ilike(lnField, s"%$name1%")
          .endAnd()
          .endOr()

      case _ =>
        // Single name - search both first and last name fields
        val condition = s"%$rawFilter%"
        query.ilike(fnField, condition).ilike(lnField, condition)
