// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import cats.effect.IO
import cats.effect.syntax.all.concurrentParTraverseOps
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.AppClock
import services.iop.{DeliveryDecision, DeliveryResult, IopDelivery}

import java.nio.file.Path
import javax.inject.Inject
import scala.concurrent.duration.{Duration, FiniteDuration}

/** The retention passes, in the order they run. The labels appear in the log. */
enum RetentionPass(val label: String):
  case AutoLock         extends RetentionPass("Unassessed attempts to archive")
  case AttemptContent   extends RetentionPass("Expired attempt content")
  case Records          extends RetentionPass("Expired grading records")
  case Bookings         extends RetentionPass("Expired enrolments and reservations")
  case HostReservations extends RetentionPass("Expired host-side visitor reservations")
  case HostAttachments  extends RetentionPass("Visiting attempt attachments left at XM")
  case HostCopies       extends RetentionPass("Expired host copies of visiting attempts")
  case Accounts         extends RetentionPass("Inactive student accounts")

/** Outcome of one retention pass. A dry run counts every due item. A real run stops looking once it
  * has a batch, so `due` is at most the batch size and `more` tells whether further items wait for
  * the next run. `applied` and `failed` count the items handled in this run.
  */
final case class PassResult(
    pass: RetentionPass,
    due: Int,
    applied: Int,
    failed: Int,
    more: Boolean = false
)

/** One item in the retention report: what a pass selected and what became of it. The outcome is
  * "due" in a dry run, and "done" or "failed: …" in a real run.
  */
final case class ReportRow(pass: RetentionPass, item: ReportItem, outcome: String)

final case class RetentionReport(
    ranAt: DateTime,
    dryRun: Boolean,
    passes: List[PassResult],
    took: FiniteDuration = Duration.Zero,
    items: List[ReportRow] = Nil
):
  def header: String =
    val mode = if dryRun then "dry run, nothing changed" else "deleting"
    s"Student data retention run at $ranAt ($mode), took ${took.toSeconds} s"

  def lines: List[String] =
    passes.map { p =>
      val more = if p.more then "+" else ""
      s"  ${p.pass.label}: due ${p.due}$more, applied ${p.applied}, failed ${p.failed}"
    }

  def summary: String = (header :: lines).mkString("\n")

/** Runs the retention passes in dependency order, so that each pass sees what the previous ones
  * removed. In dry-run mode every pass only selects and counts.
  */
class RetentionService @Inject() (
    policy: RetentionPolicy,
    repository: RetentionRepository,
    iop: IopRetentionClient,
    clock: AppClock
) extends Logging:

  private val MaxConcurrency = 5

  def run(): IO[RetentionReport] = run(policy.dryRun)

  def run(dryRun: Boolean): IO[RetentionReport] =
    val now = clock.now()
    // Both keep at most a batch per pass: a real run handles no more, and a dry run reports the
    // items the next real run would take. A dry run counts everything that is due, a real run
    // looks for one item more than a batch only to tell whether more remain.
    val limit =
      Limit(policy.batchSize, if dryRun then Int.MaxValue else policy.batchSize + 1)
    def pass[A](p: RetentionPass)(select: Limit => Selection[A])(apply: A => IO[Unit]) =
      runPass(p, dryRun)(IO.blocking(select(limit)))(apply)
    for
      start <- IO.monotonic
      a <- pass(RetentionPass.AutoLock)(repository.autoLockCandidates(policy, now, _))(id =>
        IO.blocking(repository.autoLock(id, now))
      )
      b <- pass(RetentionPass.AttemptContent)(repository.attemptCandidates(policy, now, _))(id =>
        IO.blocking(repository.stripAttempt(id))
      )
      c <- pass(RetentionPass.Records)(repository.recordCandidates(policy, now, _))(id =>
        IO.blocking(repository.deleteRecord(id))
      )
      d <- pass(RetentionPass.Bookings)(repository.bookingCandidates(policy, now, _))(
        deleteBooking(_)(now)
      )
      d2 <-
        pass(RetentionPass.HostReservations)(repository.hostReservationCandidates(policy, now, _))(
          id =>
            IO.blocking(repository.deleteHostReservation(id))
        )
      h1 <- pass(RetentionPass.HostAttachments)(repository.hostAttachmentCandidates)((_, id) =>
        iop.deleteAttachment(id)
      )
      h2 <- pass(RetentionPass.HostCopies)(repository.hostCopyCandidates(policy, now, _))(id =>
        IO.blocking(repository.clearHostCopy(id))
      )
      e <- pass(RetentionPass.Accounts)(repository.accountCandidates(policy, now, _))(id =>
        IO.blocking(repository.deleteUser(id))
      )
      end <- IO.monotonic
      results = List(a, b, c, d, d2, h1, h2, e)
      report  = RetentionReport(now, dryRun, results.map(_._1), end - start, results.flatMap(_._2))
      _ <- IO((report.header :: report.lines).foreach(logger.info(_)))
      _ <- writeReport(report)
    yield report

  // A failure to write the report is logged but does not fail the run, which has already happened
  private def writeReport(report: RetentionReport): IO[Unit] =
    policy.reportDir match
      case None => IO.unit
      case Some(dir) =>
        IO.blocking(RetentionReportFile.write(Path.of(dir), report)).attempt.flatMap {
          case Right(file) =>
            val scope =
              if report.dryRun then s" (the next run's first ${policy.batchSize} per pass)" else ""
            IO(logger.info(
              s"Retention report with ${report.items.size} items$scope written to $file"
            ))
          case Left(e) => IO(logger.warn(s"Could not write the retention report to $dir", e))
        }

  // A visiting reservation goes at XM first: its externalRef is the only key to the XM document,
  // so the local rows normally stay until that call succeeds. If XM keeps failing, for example
  // because the host organization is gone, the booking is deleted locally anyway 30 days after it
  // became due, and XM's own expiry removes its copy.
  private def deleteBooking(b: BookingCandidate)(now: DateTime): IO[Unit] =
    val remote =
      if b.remote then
        IO.blocking(repository.reservationOf(b.enrolmentId)).flatMap {
          case Some(r) =>
            iop.deleteReservation(r).attempt.flatMap {
              case Right(_) => IO.unit
              case Left(e) =>
                IopDelivery.decide(DeliveryResult.Failed(e), Some(b.dueAt), now) match
                  case DeliveryDecision.GiveUp(reason) =>
                    IO(
                      logger.warn(
                        s"Retention: deleting booking ${b.enrolmentId} without XM, $reason"
                      )
                    )
                  case _ => IO.raiseError(e)
            }
          case None => IO.unit
        }
      else IO.unit
    remote *> IO.blocking(repository.deleteBooking(b.enrolmentId))

  private def runPass[A](pass: RetentionPass, dryRun: Boolean)(select: IO[Selection[A]])(
      apply: A => IO[Unit]
  ): IO[(PassResult, List[ReportRow])] =
    select.flatMap { selection =>
      val batch = selection.items
      if dryRun || batch.isEmpty then
        val rows = batch.map(c => ReportRow(pass, c.report, "due"))
        IO.pure(PassResult(pass, selection.due, 0, 0) -> rows)
      else
        val more = selection.due > batch.size
        batch
          .parTraverseN(MaxConcurrency)(candidate =>
            apply(candidate.item).attempt.flatTap {
              case Left(e) =>
                IO(logger.warn(s"Retention, ${pass.label}: skipping ${candidate.item}", e))
              case _ => IO.unit
            }
          )
          .map { results =>
            val rows = batch.zip(results).map {
              case (c, Right(_)) => ReportRow(pass, c.report, "done")
              case (c, Left(e))  => ReportRow(pass, c.report, s"failed: ${e.getMessage}")
            }
            val done   = results.count(_.isRight)
            val result = PassResult(pass, batch.size, done, results.size - done, more)
            result -> rows
          }
    }
