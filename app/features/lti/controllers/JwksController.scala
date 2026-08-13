// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.controllers

import features.lti.services.LtiService
import play.api.mvc.*

import javax.inject.Inject

class JwksController @Inject() (
    private val ltiService: LtiService,
    val controllerComponents: ControllerComponents
) extends BaseController:

  /** Public JWK set the LTI tool fetches to verify id_tokens. Unauthenticated by design. */
  def jwks: Action[AnyContent] =
    Action {
      ltiService.jwkSet match
        case Left(error) => InternalServerError(error.message)
        case Right(json) => Ok(json).as("application/json")
    }
