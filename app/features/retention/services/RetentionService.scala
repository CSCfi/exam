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

/** Outcome of one retention pass. `due` counts every item whose retention has ended, `applied` and
  * `failed` only the ones handled in this run (at most the batch size, none in dry-run mode).
  */
final case class PassResult(name: String, due: Int, applied: Int, failed: Int)

final case class RetentionReport(ranAt: DateTime, dryRun: Boolean, passes: List[PassResult]):
  def summary: String =
    val mode = if dryRun then " (dry run, nothing changed)" else ""
    passes
      .map(p => s"${p.name}: due ${p.due}, applied ${p.applied}, failed ${p.failed}")
      .mkString(s"Retention run at $ranAt$mode - ", "; ", "")

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
    def pass[A](name: String)(select: => List[A])(apply: A => IO[Unit]) =
      runPass(name, dryRun)(IO.blocking(select))(apply)
    for
      a <- pass("A auto-lock")(repository.autoLockCandidates(policy, now))(id =>
        IO.blocking(repository.autoLock(id, now))
      )
      b <- pass("B attempts")(repository.attemptCandidates(policy, now))(id =>
        IO.blocking(repository.stripAttempt(id))
      )
      c <- pass("C records")(repository.recordCandidates(policy, now))(id =>
        IO.blocking(repository.deleteRecord(id))
      )
      d <- pass("D bookings")(repository.bookingCandidates(policy, now))(deleteBooking)
      d2 <- pass("D' host reservations")(repository.hostReservationCandidates(policy, now))(id =>
        IO.blocking(repository.deleteHostReservation(id))
      )
      h1 <- pass("H1 host attachments")(repository.hostAttachmentCandidates())((_, id) =>
        iop.deleteAttachment(id)
      )
      h2 <- pass("H2 host copies")(repository.hostCopyCandidates(policy, now))(id =>
        IO.blocking(repository.clearHostCopy(id))
      )
      e <- pass("E accounts")(repository.accountCandidates(policy, now))(id =>
        IO.blocking(repository.deleteUser(id))
      )
      report = RetentionReport(now, dryRun, List(a, b, c, d, d2, h1, h2, e))
      _ <- IO(logger.info(report.summary))
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

  private def runPass[A](name: String, dryRun: Boolean)(select: IO[List[A]])(
      apply: A => IO[Unit]
  ): IO[PassResult] =
    select.flatMap { due =>
      if dryRun || due.isEmpty then IO.pure(PassResult(name, due.size, 0, 0))
      else
        due
          .take(policy.batchSize)
          .parTraverseN(MaxConcurrency)(item =>
            apply(item).attempt.flatTap {
              case Left(e) => IO(logger.warn(s"Retention $name: skipping $item", e))
              case _       => IO.unit
            }
          )
          .map(rs => PassResult(name, due.size, rs.count(_.isRight), rs.count(_.isLeft)))
    }
