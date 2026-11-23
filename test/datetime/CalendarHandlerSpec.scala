// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package datetime

import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamImplementation, ExamState}
import models.facility.ExamMachine
import models.iop.CollaborativeExam
import models.sections.ExamSection
import models.user.User
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.http.HttpEntity
import play.api.mvc.Result
import services.datetime.CalendarHandler.TimeSlot
import services.datetime.IntervalExtensions.*
import services.datetime.{CalendarHandlerImpl, FixedAppClock, Interval}
import services.enrolment.EnrolmentHandler

import java.time.Instant
import scala.jdk.CollectionConverters.*

/** What the booking calendar shows around the student's existing reservations, and when it lets
  * them book again.
  */
class CalendarHandlerSpec extends AnyWordSpec with Matchers:

  private val now = Instant.parse("2026-03-10T08:00:00Z")

  private def handler(allowedToParticipate: Boolean = true) =
    val enrolments = new EnrolmentHandler:
      def isAllowedToParticipate(exam: Exam, user: User): Boolean = allowedToParticipate
    CalendarHandlerImpl(null, null, null, null, enrolments, FixedAppClock(now), null)

  private val ids = Iterator.from(1)

  private def at(hour: Int): Instant = now.plusSeconds(hour * 3600L)

  private def student(eppn: String): User =
    val u = new User
    u.id = ids.next().toLong
    u.eppn = eppn
    u

  private val me = student("me@test.org")

  private def exam(name: String, hash: String = ""): Exam =
    val e = new Exam
    e.id = ids.next().toLong
    e.name = name
    e.hash = hash
    e.state = ExamState.PUBLISHED
    e.implementation = ExamImplementation.AQUARIUM
    val mandatory = new ExamSection
    mandatory.id = ids.next().toLong
    e.examSections = java.util.Set.of(mandatory)
    e

  private def reservation(from: Int, to: Int, by: User = me): Reservation =
    val r = new Reservation
    r.id = ids.next().toLong
    r.startAt = at(from)
    r.endAt = at(to)
    r.user = by
    r

  private def reservationFor(e: Exam, from: Int, to: Int): Reservation =
    val r         = reservation(from, to)
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    r.enrolment = enrolment
    r

  private def reservationForCollaborative(ce: CollaborativeExam, from: Int, to: Int) =
    val r         = reservation(from, to)
    val enrolment = new ExamEnrolment
    enrolment.collaborativeExam = ce
    r.enrolment = enrolment
    r

  private def slot(from: Int, to: Int): Interval = at(from) to at(to)

  private def slotsFor(
      e: Exam,
      slots: Map[Interval, Option[Int]],
      reservations: Seq[Reservation],
      machines: Seq[ExamMachine] = Nil
  ): Set[TimeSlot] = handler().handleReservations(slots, reservations, e, machines, me)

  private def body(result: Result): String = result.body match
    case HttpEntity.Strict(data, _) => data.utf8String
    case other                      => fail(s"unexpected body $other")

  "Slots around the student's reservations" should:
    val wanted = exam("Wanted")

    "show a reservation for another exam in place of the slot, with that exam's name" in:
      slotsFor(wanted, Map(slot(2, 4) -> Some(5)), List(reservationFor(exam("Other"), 3, 5))) must
        be(Set(TimeSlot(slot(3, 5), -1, "Other")))

    "name a collaborative exam the same way" in:
      val ce = new CollaborativeExam
      ce.name = "Shared"
      ce.hash = "other-hash"
      slotsFor(wanted, Map(slot(2, 4) -> Some(5)), List(reservationForCollaborative(ce, 3, 5))) must
        be(Set(TimeSlot(slot(3, 5), -1, "Shared")))

    "show the student's own reservation for this exam once, as their own" in:
      val own = reservationFor(wanted, 2, 4)
      slotsFor(wanted, Map(slot(2, 4) -> Some(5), slot(3, 5) -> Some(5)), List(own)) must be(
        Set(TimeSlot(slot(2, 4), -1, ""))
      )

    "count a reservation for the same collaborative exam as their own" in:
      val sameHash = exam("Collaborative copy", hash = "shared-hash")
      val ce       = new CollaborativeExam
      ce.hash = "shared-hash"
      slotsFor(
        sameHash,
        Map(slot(2, 4) -> Some(5)),
        List(reservationForCollaborative(ce, 1, 3))
      ) must
        be(Set(TimeSlot(slot(1, 3), -1, "")))

    "give a free slot the machine count it came with" in:
      slotsFor(wanted, Map(slot(2, 4) -> Some(3)), List(reservationFor(exam("Later"), 6, 8))) must
        be(Set(TimeSlot(slot(2, 4), 3, "")))

    "otherwise count the machines nobody else has reserved then" in:
      def machine(reservations: Reservation*) =
        val m = new ExamMachine
        m.reservations = reservations.toList.asJava
        m
      val machines = List(
        machine(),
        machine(reservation(3, 5, by = student("other@test.org"))),
        machine(reservation(3, 5)), // the student's own, elsewhere
        machine(reservation(4, 6, by = student("later@test.org")))
      )
      slotsFor(wanted, Map(slot(2, 4) -> None), Nil, machines) must be(
        Set(TimeSlot(slot(2, 4), 3, ""))
      )

  "Booking again" should:
    def enrolment(e: Exam, old: Option[Reservation] = None): ExamEnrolment =
      val en = new ExamEnrolment
      en.exam = e
      en.reservation = old.orNull
      en

    def refusal(en: ExamEnrolment, sections: Seq[Long] = Nil, allowed: Boolean = true) =
      handler(allowed).checkEnrolment(en, me, sections).map(body)

    "be allowed for an exam in a room with no earlier reservation" in:
      refusal(enrolment(exam("Room exam"))) must be(None)

    "be refused for exams taken on the student's own computer" in:
      val e = exam("BYOD")
      e.implementation = ExamImplementation.CLIENT_AUTH
      refusal(enrolment(e)) must be(Some("SEB exam does not take reservations"))

    "be refused once the exam has begun or the reservation is over" in:
      val started = exam("Started")
      started.state = ExamState.STUDENT_STARTED
      refusal(enrolment(started)) must be(Some("i18n_reservation_in_effect"))
      refusal(enrolment(exam("Past"), Some(reservation(-3, -1)))) must be(
        Some("i18n_reservation_in_effect")
      )

    "be refused without trials left, but only for a first reservation" in:
      refusal(enrolment(exam("Used up")), allowed = false) must be(Some("i18n_no_trials_left"))
      refusal(enrolment(exam("Moving"), Some(reservation(3, 5))), allowed = false) must be(None)

    "need one section chosen when all of them are optional" in:
      val e       = exam("Optional")
      val section = new ExamSection
      section.id = 77L
      section.optional = true
      e.examSections = java.util.Set.of(section)
      refusal(enrolment(e)) must be(Some("No optional sections selected. At least one needed"))
      refusal(enrolment(e), sections = List(77L)) must be(None)

    "wait for the assessment of a visit that has begun elsewhere" in:
      val visit = reservation(-1, 1)
      visit.externalRef = "xm-reservation"
      refusal(enrolment(exam("Visit"), Some(visit))) must be(
        Some("i18n_enrolment_assessment_not_received")
      )

      val missed = enrolment(exam("Missed visit"), Some(visit))
      missed.noShow = true
      refusal(missed) must be(None)
