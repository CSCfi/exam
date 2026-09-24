// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import cats.effect.IO
import cats.effect.syntax.all.concurrentParTraverseOps
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.AppClock

import javax.inject.Inject

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

/** Outcome of one retention pass. `due` counts every item whose retention has ended, `applied` and
  * `failed` only the ones handled in this run (at most the batch size, none in dry-run mode).
  */
final case class PassResult(pass: RetentionPass, due: Int, applied: Int, failed: Int)

final case class RetentionReport(ranAt: DateTime, dryRun: Boolean, passes: List[PassResult]):
  def header: String =
    val mode = if dryRun then "dry run, nothing changed" else "deleting"
    s"Student data retention run at $ranAt ($mode)"

  def lines: List[String] =
    passes.map(p => s"  ${p.pass.label}: due ${p.due}, applied ${p.applied}, failed ${p.failed}")

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
    def pass[A](p: RetentionPass)(select: => List[A])(apply: A => IO[Unit]) =
      runPass(p, dryRun)(IO.blocking(select))(apply)
    for
      a <- pass(RetentionPass.AutoLock)(repository.autoLockCandidates(policy, now))(id =>
        IO.blocking(repository.autoLock(id, now))
      )
      b <- pass(RetentionPass.AttemptContent)(repository.attemptCandidates(policy, now))(id =>
        IO.blocking(repository.stripAttempt(id))
      )
      c <- pass(RetentionPass.Records)(repository.recordCandidates(policy, now))(id =>
        IO.blocking(repository.deleteRecord(id))
      )
      d <- pass(RetentionPass.Bookings)(repository.bookingCandidates(policy, now))(deleteBooking)
      d2 <- pass(RetentionPass.HostReservations)(repository.hostReservationCandidates(policy, now))(
        id =>
          IO.blocking(repository.deleteHostReservation(id))
      )
      h1 <- pass(RetentionPass.HostAttachments)(repository.hostAttachmentCandidates())((_, id) =>
        iop.deleteAttachment(id)
      )
      h2 <- pass(RetentionPass.HostCopies)(repository.hostCopyCandidates(policy, now))(id =>
        IO.blocking(repository.clearHostCopy(id))
      )
      e <- pass(RetentionPass.Accounts)(repository.accountCandidates(policy, now))(id =>
        IO.blocking(repository.deleteUser(id))
      )
      report = RetentionReport(now, dryRun, List(a, b, c, d, d2, h1, h2, e))
      _ <- IO((report.header :: report.lines).foreach(logger.info(_)))
    yield report

  // A visiting reservation must go at XM first: its externalRef is the only key to the XM
  // document, so the local rows stay until that call succeeds
  private def deleteBooking(b: BookingCandidate): IO[Unit] =
    // Only the home organisation holds the external reservation data. A host-side copy of the
    // same reservation is removed through XM when the home organisation deletes its own
    val remote = b.reservation
      .filter(r => Option(r.externalRef).isDefined && Option(r.externalReservation).isDefined) match
      case Some(r) => iop.deleteReservation(r)
      case None    => IO.unit
    remote *> IO.blocking(repository.deleteBooking(b.enrolmentId))

  private def runPass[A](pass: RetentionPass, dryRun: Boolean)(select: IO[List[A]])(
      apply: A => IO[Unit]
  ): IO[PassResult] =
    select.flatMap { due =>
      if dryRun || due.isEmpty then IO.pure(PassResult(pass, due.size, 0, 0))
      else
        due
          .take(policy.batchSize)
          .parTraverseN(MaxConcurrency)(item =>
            apply(item).attempt.flatTap {
              case Left(e) => IO(logger.warn(s"Retention, ${pass.label}: skipping $item", e))
              case _       => IO.unit
            }
          )
          .map(rs => PassResult(pass, due.size, rs.count(_.isRight), rs.count(_.isLeft)))
    }
