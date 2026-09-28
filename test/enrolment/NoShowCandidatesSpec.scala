// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.*
import models.exam.{Exam, ExamState}
import models.user.User
import org.joda.time.DateTime
import system.jobs.ReservationPollerService

/** The no-show check loads only enrolments that can still be no-shows, not every past attempt. */
class NoShowCandidatesSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def setup(): Unit =
    val _ = app
    ensureTestDataLoaded()

  private def examIn(state: ExamState): Exam =
    DB.find(classOf[Exam]).where().eq("state", state).setMaxRows(1).find.get

  private def user: User = DB.find(classOf[User]).where().setMaxRows(1).find.get

  private def withReservation(exam: Exam, endedHoursAgo: Int, noShow: Boolean = false) =
    val r = new Reservation
    r.startAt = DateTime.now.minusHours(endedHoursAgo + 2)
    r.endAt = DateTime.now.minusHours(endedHoursAgo)
    r.user = user
    r.save()
    val e = new ExamEnrolment
    e.user = user
    e.exam = exam
    e.reservation = r
    e.noShow = noShow
    e.save()
    e.id

  private def withEvent(exam: Exam, startedHoursAgo: Int) =
    val event = new ExaminationEvent
    event.start = DateTime.now.minusHours(startedHoursAgo)
    event.description = "no-show spec"
    event.capacity = 10
    event.save()
    val config = new ExaminationEventConfiguration
    config.exam = exam
    config.examinationEvent = event
    config.save()
    val e = new ExamEnrolment
    e.user = user
    e.exam = exam
    e.examinationEventConfiguration = config
    e.save()
    e.id

  private def candidates: Set[Long] =
    app.injector
      .instanceOf(classOf[ReservationPollerService])
      .findNoShowCandidates()
      .map(_.id.longValue)
      .toSet

  "No-show candidates" should:
    "include past bookings for exams not yet started" in:
      setup()
      val published = withReservation(examIn(ExamState.PUBLISHED), 1)
      val event     = withEvent(examIn(ExamState.PUBLISHED), 24)
      candidates must contain allOf (published, event)

    "leave out attempts already taken or assessed" in:
      setup()
      val review = withReservation(examIn(ExamState.REVIEW), 1)
      val graded = withReservation(examIn(ExamState.GRADED), 1)
      candidates must contain noneOf (review, graded)

    "leave out bookings not over yet and ones already marked" in:
      setup()
      // Ends beyond the DST adjustment (+1 h in summer) applied to "now" in the comparison
      val upcoming = withReservation(examIn(ExamState.PUBLISHED), -3)
      val marked   = withReservation(examIn(ExamState.PUBLISHED), 1, noShow = true)
      val event    = withEvent(examIn(ExamState.PUBLISHED), 0)
      candidates must contain noneOf (upcoming, marked, event)
