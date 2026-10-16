// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import com.typesafe.config.{Config, ConfigFactory}
import features.retention.services.RetentionPolicy
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

import java.time.Period

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
      p.inactivity mustBe Period.ofMonths(6)
      p.booking mustBe Period.ofYears(2)
      p.attempt mustBe Period.ofMonths(6)
      p.maturityAttempt mustBe Period.ofMonths(6)
      p.abortedAttempt mustBe Period.ofYears(1)
      p.autoLock mustBe Period.ofYears(1)
      p.record mustBe Period.ofYears(2)
      p.hostCopy mustBe Period.ofMonths(3)
      p.dryRun mustBe true
      p.batchSize mustBe 20000
    }
    "take the assessed attempt period from the legacy expiration setting" in {
      val p = RetentionPolicy.fromConfig(config("""exam.exam.expiration.period = "P9M""""))
      p.attempt mustBe Period.ofMonths(9)
    }
    "let the assessed attempt period override the legacy setting" in {
      val p = RetentionPolicy.fromConfig(config(
        """exam.exam.expiration.period = "P9M"
          |exam.retention.attempt.assessed = "P1Y"""".stripMargin
      ))
      p.attempt mustBe Period.ofYears(1)
    }
    "clamp attempt periods to their allowed ranges" in {
      val low = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P1M"
          |exam.retention.attempt.maturity = "P3M"""".stripMargin
      ))
      low.attempt mustBe Period.ofMonths(6)
      low.maturityAttempt mustBe Period.ofMonths(6)
      val high = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P2Y"
          |exam.retention.attempt.maturity = "P3Y"""".stripMargin
      ))
      high.attempt mustBe Period.ofYears(1)
      high.maturityAttempt mustBe Period.ofYears(2)
    }
    "accept the range limits themselves" in {
      val p = RetentionPolicy.fromConfig(config(
        """exam.retention.attempt.assessed = "P12M"
          |exam.retention.attempt.maturity = "P24M"""".stripMargin
      ))
      p.attempt mustBe Period.ofMonths(12)
      p.maturityAttempt mustBe Period.ofMonths(24)
    }
    "fail on an invalid duration" in {
      a[java.time.format.DateTimeParseException] must be thrownBy
        RetentionPolicy.fromConfig(config("""exam.retention.booking = "two years""""))
    }
  }
