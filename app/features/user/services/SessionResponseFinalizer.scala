// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

import play.api.mvc.*
import repository.EnrolmentRepository
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.Future
import scala.util.Try

/** The single place where a `SessionController` action should attach a session to its `Result`.
  * Merges reservation headers (upcoming/ongoing exam, wrong machine, etc.) into the session
  * whenever the resulting session belongs to a student, so callers can't forget to do so.
  */
class SessionResponseFinalizer @Inject() (
    sessionService: SessionService,
    enrolmentRepository: EnrolmentRepository
)(implicit ec: BlockingIOExecutionContext):

  def attachSession(
      request: Request[AnyContent],
      result: Result,
      sessionData: SessionData
  ): Future[Result] =
    if sessionService.isStudent(sessionData) then
      (sessionData.get("id").flatMap(id => Try(id.toLong).toOption), sessionData.get("eppn")) match
        case (Some(userId), Some(eppn)) =>
          enrolmentRepository.getReservationHeaders(request, userId, eppn).map { headers =>
            val updatedSessionData =
              sessionService.updateSessionWithReservationHeaders(sessionData, headers)
            result.withSession(Session(updatedSessionData))
          }
        case _ => Future.successful(result.withSession(Session(sessionData)))
    else Future.successful(result.withSession(Session(sessionData)))
