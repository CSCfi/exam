// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import play.api.mvc.ActionFilter
import security.scala.AuthExecutionContext

import javax.inject.Inject

/** Factory for creating validator filters that can be injected into controllers
  */
class Validators @Inject() (implicit ec: AuthExecutionContext):

  /** Create a validator filter from a PlayJsonValidator instance
    */
  def validated(validator: PlayJsonValidator): ActionFilter[play.api.mvc.Request] =
    validator.filter
