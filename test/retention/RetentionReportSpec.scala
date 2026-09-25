// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import features.retention.services.{PassResult, RetentionPass, RetentionReport}
import org.joda.time.{DateTime, DateTimeZone}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import system.jobs.StudentDataRetentionJob

import scala.concurrent.duration.*

class RetentionReportSpec extends AnyWordSpec with Matchers:

  private val at = new DateTime(2026, 9, 24, 18, 3, DateTimeZone.UTC)

  "untilNextRun" should {
    val zone = DateTimeZone.forID("Europe/Helsinki")
    "wait until two o'clock the same night" in {
      val now = new DateTime(2026, 9, 25, 0, 30, zone)
      StudentDataRetentionJob.untilNextRun(now) mustBe 90.minutes
    }
    "wait until the next night once two o'clock has passed" in {
      val now = new DateTime(2026, 9, 24, 21, 0, zone)
      StudentDataRetentionJob.untilNextRun(now) mustBe 5.hours
      StudentDataRetentionJob.untilNextRun(new DateTime(2026, 9, 25, 2, 0, zone)) mustBe 24.hours
    }
    "count real hours across a daylight saving change" in {
      // Clocks go back from 04:00 to 03:00 on 25 October 2026 in Helsinki, so that night is an
      // hour longer: 02:30 to 02:00 the next night is 24.5 hours
      val autumn = new DateTime(2026, 10, 25, 2, 30, zone)
      StudentDataRetentionJob.untilNextRun(autumn) mustBe 24.hours + 30.minutes
      // and forward from 03:00 to 04:00 on 29 March 2026, an hour shorter
      val spring = new DateTime(2026, 3, 29, 2, 30, zone)
      StudentDataRetentionJob.untilNextRun(spring) mustBe 22.hours + 30.minutes
    }
  }

  "RetentionReport" should {
    "name the mode and list every pass on its own line" in {
      val report = RetentionReport(
        at,
        dryRun = true,
        List(
          PassResult(RetentionPass.AutoLock, 765, 0, 0),
          PassResult(RetentionPass.Accounts, 4, 0, 0)
        ),
        61.seconds
      )
      report.summary mustBe
        """Student data retention run at 2026-09-24T18:03:00.000Z (dry run, nothing changed), took 61 s
          |  Unassessed attempts to archive: due 765, applied 0, failed 0
          |  Inactive student accounts: due 4, applied 0, failed 0""".stripMargin
    }
    "say when it deletes" in {
      RetentionReport(at, dryRun = false, Nil).header must include("(deleting)")
    }
    "mark a pass that left items for the next run" in {
      val report = RetentionReport(
        at,
        dryRun = false,
        List(PassResult(RetentionPass.AttemptContent, 2000, 1998, 2, more = true))
      )
      report.lines mustBe List("  Expired attempt content: due 2000+, applied 1998, failed 2")
    }
    "have a distinct label for every pass" in {
      RetentionPass.values.map(_.label).distinct.length mustBe RetentionPass.values.length
    }
  }
