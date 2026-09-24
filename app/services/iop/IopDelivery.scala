// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import org.joda.time.{DateTime, Period}
import play.api.http.Status.NOT_FOUND
import play.api.libs.ws.WSResponse

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

/** Common rules for items sent to XM by scheduled jobs. A failure is normally retried on the next
  * run. An item leaves the pipeline once retrying cannot help: XM no longer knows the document or
  * the organisation (404), the request cannot be built, or it has kept failing for [[GiveUpAfter]].
  */
object IopDelivery:
  val GiveUpAfter: Period = Period.days(30)

  def fromResponse(response: WSResponse, success: Int): DeliveryResult =
    if response.status == success then DeliveryResult.Delivered
    else
      val answer = Option(response.body).map(_.trim).getOrElse("").take(200)
      DeliveryResult.Rejected(response.status, answer)

  /** `since` is when the item became ready to send, such as the end of the exam. */
  def decide(result: DeliveryResult, since: Option[DateTime], now: DateTime): DeliveryDecision =
    result match
      case DeliveryResult.Delivered => DeliveryDecision.Done
      case DeliveryResult.Rejected(NOT_FOUND, _) =>
        DeliveryDecision.GiveUp(s"XM does not know it (${result.describe})")
      case DeliveryResult.Invalid(_) => DeliveryDecision.GiveUp(result.describe)
      case _ if since.exists(!_.plus(GiveUpAfter).isAfter(now)) =>
        DeliveryDecision.GiveUp(
          s"still failing ${GiveUpAfter.getDays} days after it became ready. " +
            s"Last answer: ${result.describe}"
        )
      case _ => DeliveryDecision.RetryLater(result.describe)
