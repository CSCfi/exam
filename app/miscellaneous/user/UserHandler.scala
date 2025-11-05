// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.user

import com.google.inject.ImplementedBy
import io.ebean.ExpressionList

@ImplementedBy(classOf[UserHandlerImpl])
trait UserHandler:
  def applyNameSearch[T](prefix: String, query: ExpressionList[T], filter: String): ExpressionList[T]
