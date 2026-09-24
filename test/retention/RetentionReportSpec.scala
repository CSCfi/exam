// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import features.retention.services.{PassResult, RetentionPass, RetentionReport}
import org.joda.time.{DateTime, DateTimeZone}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec

class RetentionReportSpec extends AnyWordSpec with Matchers:

  private val at = new DateTime(2026, 9, 24, 18, 3, DateTimeZone.UTC)

  "RetentionReport" should {
    "name the mode and list every pass on its own line" in {
      val report = RetentionReport(
        at,
        dryRun = true,
        List(
          PassResult(RetentionPass.AutoLock, 765, 0, 0),
          PassResult(RetentionPass.Accounts, 4, 0, 0)
        )
      )
      report.summary mustBe
        """Student data retention run at 2026-09-24T18:03:00.000Z (dry run, nothing changed)
          |  Unassessed attempts to archive: due 765, applied 0, failed 0
          |  Inactive student accounts: due 4, applied 0, failed 0""".stripMargin
    }
    "say when it deletes" in {
      RetentionReport(at, dryRun = false, Nil).header must endWith("(deleting)")
    }
    "have a distinct label for every pass" in {
      RetentionPass.values.map(_.label).distinct.length mustBe RetentionPass.values.length
    }
  }
