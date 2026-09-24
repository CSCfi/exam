// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import org.joda.time.{DateTime, DateTimeZone}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import services.iop.*

class IopDeliverySpec extends AnyWordSpec with Matchers:

  private val now    = new DateTime(2026, 9, 24, 12, 0, DateTimeZone.UTC)
  private val recent = Some(now.minusDays(1))
  private val old    = Some(now.minusDays(30))

  private def isGiveUp(d: DeliveryDecision) = d match
    case DeliveryDecision.GiveUp(_) => true
    case _                          => false

  "decide" should {
    "be done once delivered" in {
      IopDelivery.decide(DeliveryResult.Delivered, old, now) mustBe DeliveryDecision.Done
    }
    "give up at once when XM no longer knows the item" in {
      val d = IopDelivery.decide(DeliveryResult.Rejected(404, "missing"), recent, now)
      isGiveUp(d) mustBe true
      d.toString must include("404 missing")
    }
    "give up at once when the request cannot be built" in {
      isGiveUp(IopDelivery.decide(DeliveryResult.Invalid("bad ref"), recent, now)) mustBe true
    }
    "retry other failures while the item is recent" in {
      val rejected = IopDelivery.decide(DeliveryResult.Rejected(502, ""), recent, now)
      rejected mustBe DeliveryDecision.RetryLater("502")
      val failed =
        IopDelivery.decide(DeliveryResult.Failed(new RuntimeException("down")), recent, now)
      failed mustBe DeliveryDecision.RetryLater("no answer: down")
    }
    "give up on other failures 30 days after the item became ready" in {
      isGiveUp(IopDelivery.decide(DeliveryResult.Rejected(500, ""), old, now)) mustBe true
      val almost = Some(now.minusDays(30).plusMinutes(1))
      IopDelivery.decide(DeliveryResult.Rejected(500, ""), almost, now) mustBe
        DeliveryDecision.RetryLater("500")
    }
    "keep retrying when it is unknown since when the item has been ready" in {
      IopDelivery.decide(DeliveryResult.Rejected(500, ""), None, now) mustBe
        DeliveryDecision.RetryLater("500")
    }
  }

  "decide for exam attempts" should {
    "retry weekly instead of giving up once the time limit has passed" in {
      val d =
        IopDelivery.decide(DeliveryResult.Rejected(500, "boom"), old, now, AfterTimeLimit.SlowDown)
      d match
        case DeliveryDecision.RetrySlowly(reason) => reason must include("500 boom")
        case other                                => fail(s"Expected a slow retry, got $other")
    }
    "still give up at once when XM no longer knows the item" in {
      val d =
        IopDelivery.decide(DeliveryResult.Rejected(404, ""), old, now, AfterTimeLimit.SlowDown)
      isGiveUp(d) mustBe true
    }
    "retry on every run while within the time limit" in {
      IopDelivery.decide(
        DeliveryResult.Rejected(500, ""),
        recent,
        now,
        AfterTimeLimit.SlowDown
      ) mustBe
        DeliveryDecision.RetryLater("500")
    }
  }

  "isDueForAttempt" should {
    "always try an item within the time limit" in {
      IopDelivery.isDueForAttempt(recent, Some(now.minusMinutes(5)), now) mustBe true
    }
    "try an item past the limit once a week" in {
      IopDelivery.isDueForAttempt(old, Some(now.minusDays(6)), now) mustBe false
      IopDelivery.isDueForAttempt(old, Some(now.minusDays(7)), now) mustBe true
    }
    "try an item past the limit that was never tried" in {
      IopDelivery.isDueForAttempt(old, None, now) mustBe true
    }
  }
