// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.user

import com.google.inject.ImplementedBy
import io.ebean.ExpressionList

@ImplementedBy(classOf[UserHandlerImpl])
trait UserHandler:
  /** Matches `filter` against the given first and last name paths, both checked with `path[T]`. */
  def applyNameSearch[T](
      firstName: String,
      lastName: String,
      query: ExpressionList[T],
      filter: String
  ): ExpressionList[T]
