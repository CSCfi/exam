// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import org.joda.time.DateTime
import play.api.http.Status.NOT_FOUND
import play.api.libs.ws.WSResponse
import services.retention.RetentionLimits

/** Result of one attempt to deliver something to XM. */
enum DeliveryResult:
  case Delivered

  /** XM answered, but not with success */
  case Rejected(status: Int, answer: String)

  /** No answer from XM */
  case Failed(error: Throwable)

  /** The request could not even be built, for example from a broken reference */
  case Invalid(reason: String)

  def describe: String = this match
    case Delivered                => "delivered"
    case Rejected(status, answer) => if answer.isEmpty then s"$status" else s"$status $answer"
    case Failed(error)            => s"no answer: ${error.getMessage}"
    case Invalid(reason)          => reason

/** What a sender should do after a delivery attempt. */
enum DeliveryDecision:
  case Done

  /** Take the item out of the pipeline for good, logging `reason` once */
  case GiveUp(reason: String)

  /** Leave the item for the next scheduled attempt */
  case RetryLater(reason: String)

  /** Keep the item, but try it only once every [[RetentionLimits.IopSlowRetryInterval]] from now on
    */
  case RetrySlowly(reason: String)

/** What happens to an item that still fails once [[RetentionLimits.IopGiveUpAfter]] has passed. */
enum AfterTimeLimit:
  /** For items whose loss does no harm, such as no-show notices */
  case GiveUp

  /** For exam attempts, which must not get lost: a receiver may fail only until it is fixed, so
    * they are retried once a week until the retention job removes them
    */
  case SlowDown

/** Common rules for items sent to XM by scheduled jobs. A failure is normally retried on the next
  * run. An item leaves the pipeline once retrying cannot help: XM or the receiver no longer knows
  * the item (404), or the request cannot be built. An item that keeps failing otherwise is given up
  * or retried weekly after [[RetentionLimits.IopGiveUpAfter]], depending on [[AfterTimeLimit]].
  */
object IopDelivery:
  private val GiveUpAfter       = RetentionLimits.IopGiveUpAfter
  private val SlowRetryInterval = RetentionLimits.IopSlowRetryInterval

  private def pastLimit(since: Option[DateTime], now: DateTime): Boolean =
    since.exists(!_.plus(GiveUpAfter).isAfter(now))

  /** Whether an item should be tried in this run: always within the time limit, afterwards once
    * every [[RetentionLimits.IopSlowRetryInterval]] since the last attempt.
    */
  def isDueForAttempt(
      since: Option[DateTime],
      lastAttempt: Option[DateTime],
      now: DateTime
  ): Boolean =
    !pastLimit(since, now) || lastAttempt.forall(!_.plus(SlowRetryInterval).isAfter(now))

  def fromResponse(response: WSResponse, success: Int): DeliveryResult =
    if response.status == success then DeliveryResult.Delivered
    else
      val answer = Option(response.body).map(_.trim).getOrElse("").take(200)
      DeliveryResult.Rejected(response.status, answer)

  /** `since` is when the item became ready to send, such as the end of the exam. */
  def decide(
      result: DeliveryResult,
      since: Option[DateTime],
      now: DateTime,
      afterLimit: AfterTimeLimit = AfterTimeLimit.GiveUp
  ): DeliveryDecision =
    result match
      case DeliveryResult.Delivered => DeliveryDecision.Done
      case DeliveryResult.Rejected(NOT_FOUND, _) =>
        DeliveryDecision.GiveUp(s"XM does not know it (${result.describe})")
      case DeliveryResult.Invalid(_) => DeliveryDecision.GiveUp(result.describe)
      case _ if pastLimit(since, now) =>
        val failing = s"still failing ${GiveUpAfter.getDays} days after it became ready"
        afterLimit match
          case AfterTimeLimit.GiveUp =>
            DeliveryDecision.GiveUp(s"$failing. Last answer: ${result.describe}")
          case AfterTimeLimit.SlowDown =>
            DeliveryDecision.RetrySlowly(
              s"$failing, trying again in ${SlowRetryInterval.getWeeks} week. " +
                s"Last answer: ${result.describe}"
            )
      case _ => DeliveryDecision.RetryLater(result.describe)
