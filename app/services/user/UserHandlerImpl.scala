// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.user

import io.ebean.ExpressionList

class UserHandlerImpl extends UserHandler:

  override def applyNameSearch[T](
      firstName: String,
      lastName: String,
      query: ExpressionList[T],
      filter: String
  ): ExpressionList[T] =
    val rawFilter = filter.replaceAll(" +", " ").trim

    rawFilter.split(" ").toList match
      case name1 :: name2 :: _ =>
        // User provided two names - try combinations of first and last names
        query
          .or()
          .and()
          .ilike(firstName, s"%$name1%")
          .ilike(lastName, s"%$name2%")
          .endAnd()
          .and()
          .ilike(firstName, s"%$name2%")
          .ilike(lastName, s"%$name1%")
          .endAnd()
          .endOr()

      case _ =>
        // Single name - search both first and last name fields
        val condition = s"%$rawFilter%"
        query.ilike(firstName, condition).ilike(lastName, condition)
