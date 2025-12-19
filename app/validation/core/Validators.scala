// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.core

import play.api.mvc.ActionRefiner
import security.AuthExecutionContext

import javax.inject.Inject

/** Factory for creating validator filters that can be injected into controllers
  */
class Validators @Inject() (implicit ec: AuthExecutionContext):

  /** Create a validator refiner from a PlayJsonValidator instance
    */
  def validated(validator: PlayJsonValidator)
      : ActionRefiner[play.api.mvc.Request, play.api.mvc.Request] =
    validator.filter
