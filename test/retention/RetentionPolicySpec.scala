// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import com.typesafe.config.{Config, ConfigFactory}
import features.retention.services.RetentionPolicy
import org.joda.time.Period
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class RetentionPolicySpec extends AnyWordSpec with Matchers:

  // The shipped defaults, resolved the same way Play resolves application.conf
  private def config(overrides: String = ""): Config =
    ConfigFactory
      .parseString(overrides)
      .withFallback(ConfigFactory.parseResources("application.conf"))
      .resolve()

  "fromConfig" should {
    "read the shipped defaults" in {
      val p = RetentionPolicy.fromConfig(config())
      p.inactivity mustBe Period.months(6)
      p.booking mustBe Period.years(2)
      p.attempt mustBe Period.months(6)
      p.maturityAttempt mustBe Period.months(6)
      p.abortedAttempt mustBe Period.years(1)
      p.autoLock mustBe Period.years(1)
      p.record mustBe Period.years(2)
      p.hostCopy mustBe Period.months(3)
      p.dryRun mustBe true
      p.batchSize mustBe 500
    }
    "take the assessed attempt period from the legacy expiration setting" in {
      val p = RetentionPolicy.fromConfig(config("""exam.exam.expiration.period = "P9M""""))
      p.attempt mustBe Period.months(9)
    }
    "let the assessed attempt period override the legacy setting" in {
      val p = RetentionPolicy.fromConfig(config(
        """exam.exam.expiration.period = "P9M"
          |exam.retention.attempt.assessed = "P1Y"""".stripMargin
      ))
      p.attempt mustBe Period.years(1)
    }
    "clamp attempt periods to their allowed ranges" in {
      val low = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P1M"
          |exam.retention.attempt.maturity = "P3M"""".stripMargin
      ))
      low.attempt mustBe Period.months(6)
      low.maturityAttempt mustBe Period.months(6)
      val high = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P2Y"
          |exam.retention.attempt.maturity = "P3Y"""".stripMargin
      ))
      high.attempt mustBe Period.years(1)
      high.maturityAttempt mustBe Period.years(2)
    }
    "accept the range limits themselves" in {
      val p = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P12M"
          |exam.retention.attempt.maturity = "P24M"""".stripMargin
      ))
      p.attempt mustBe Period.months(12)
      p.maturityAttempt mustBe Period.months(24)
    }
    "fail on an invalid duration" in {
      an[IllegalArgumentException] must be thrownBy
        RetentionPolicy.fromConfig(config("""exam.retention.booking = "two years""""))
    }
  }
