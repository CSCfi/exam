// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.controllers

import features.lti.services.LtiService
import play.api.mvc.*
import play.api.mvc.Results.NotFound
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

/** Answers 404 for every LTI endpoint while LTI is not active (`lti.active`), as if it did not
  * exist. Composed first, so it applies before authentication too.
  */
class LtiActive @Inject() (ltiService: LtiService, ec: BlockingIOExecutionContext)
    extends ActionFilter[Request]:
  override protected def executionContext: ExecutionContext = ec

  override protected def filter[A](request: Request[A]): Future[Option[Result]] =
    Future.successful(Option.when(!ltiService.active)(NotFound))
