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

final case class RetentionReport(
    ranAt: DateTime,
    dryRun: Boolean,
    passes: List[PassResult],
    took: FiniteDuration = Duration.Zero
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
    // A dry run counts everything that is due. A real run looks for one item more than a batch,
    // only to tell whether more remain.
    val limit = if dryRun then Int.MaxValue else policy.batchSize + 1
    def pass[A](p: RetentionPass)(select: Int => List[A])(apply: A => IO[Unit]) =
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
      h1 <- pass(RetentionPass.HostAttachments)(repository.hostAttachmentCandidates(_))((_, id) =>
        iop.deleteAttachment(id)
      )
      h2 <- pass(RetentionPass.HostCopies)(repository.hostCopyCandidates(policy, now, _))(id =>
        IO.blocking(repository.clearHostCopy(id))
      )
      e <- pass(RetentionPass.Accounts)(repository.accountCandidates(policy, now, _))(id =>
        IO.blocking(repository.deleteUser(id))
      )
      end <- IO.monotonic
      report = RetentionReport(now, dryRun, List(a, b, c, d, d2, h1, h2, e), end - start)
      _ <- IO((report.header :: report.lines).foreach(logger.info(_)))
    yield report

  // A visiting reservation goes at XM first: its externalRef is the only key to the XM document,
  // so the local rows normally stay until that call succeeds. If XM keeps failing, for example
  // because the host organisation is gone, the booking is deleted locally anyway 30 days after it
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

  private def runPass[A](pass: RetentionPass, dryRun: Boolean)(select: IO[List[A]])(
      apply: A => IO[Unit]
  ): IO[PassResult] =
    select.flatMap { due =>
      if dryRun || due.isEmpty then IO.pure(PassResult(pass, due.size, 0, 0))
      else
        val batch = due.take(policy.batchSize)
        val more  = due.size > batch.size
        batch
          .parTraverseN(MaxConcurrency)(item =>
            apply(item).attempt.flatTap {
              case Left(e) => IO(logger.warn(s"Retention, ${pass.label}: skipping $item", e))
              case _       => IO.unit
            }
          )
          .map(rs => PassResult(pass, batch.size, rs.count(_.isRight), rs.count(_.isLeft), more))
    }
