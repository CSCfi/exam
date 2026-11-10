// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

import models.user.{Role, User}
import play.api.cache.SyncCacheApi

import javax.inject.{Inject, Singleton}
import scala.concurrent.duration.*

/** Where the tool is shown: in EXAM's frame, or in a window of its own. */
enum LtiDocumentTarget(val claim: String):
  case Iframe extends LtiDocumentTarget("iframe")
  case Window extends LtiDocumentTarget("window")

/** What a login started for: a launch of a question in an exam, or a deep linking request. */
enum LtiLoginTarget:
  case Launch(sectionQuestionId: Long, examHash: String, documentTarget: LtiDocumentTarget)
  case DeepLink(id: String)

/** A login started by `userId` in the role they were logged in as, waiting for the tool to call
  * back.
  */
final case class LtiLogin(userId: Long, role: Role.Name, target: LtiLoginTarget)

/** Logins in progress, kept under their `login_hint` until the tool calls back.
  *
  * The callback cannot rely on EXAM's session: it reaches EXAM through a redirect from the tool,
  * and when the tool is on another site that is a cross-site request, inside an iframe for a
  * launch, so the browser leaves out the `SameSite=Lax` session cookie. The `login_hint` travels
  * through the tool instead, the way the deep linking request's id does. It is random, used once,
  * and expires after [[LtiLogins.Ttl]].
  */
@Singleton
class LtiLogins @Inject() (ltiService: LtiService, cache: SyncCacheApi):

  import LtiLogins.*

  /** Starts a login for the user. Returns its `login_hint`. */
  def start(user: User, target: LtiLoginTarget): String =
    val hint = ltiService.generateLoginHint
    cache.set(cacheKey(hint), LtiLogin(user.id, user.loginRole, target), Ttl)
    hint

  /** The login a tool calls back for. It can be taken once. */
  def take(hint: String): Either[LtiError, LtiLogin] =
    // The cache has no atomic remove-and-get; this keeps two callbacks from both taking it.
    synchronized {
      val login = cache.get[LtiLogin](cacheKey(hint))
      login.foreach(_ => cache.remove(cacheKey(hint)))
      login
    }.toRight(LtiError.UnknownLoginHint)

object LtiLogins:
  /** How long the round trip through the tool may take. */
  val Ttl: FiniteDuration = 5.minutes

  private def cacheKey(hint: String) = s"lti-login:$hint"
