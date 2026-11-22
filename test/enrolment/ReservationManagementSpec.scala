// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.*
import models.exam.{Exam, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS}
import java.util.UUID
import scala.jdk.CollectionConverters.*

/** Finding, listing and removing reservations */
class ReservationManagementSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def olli: User               = user("teacher@funet.fi")
  private def arvon: User              = user("teacher@b.funet.fi")
  private def student: User            = user("student@funet.fi")

  private def room: ExamRoom = DB.find(classOf[ExamRoom], 1L)
  private def machines: List[ExamMachine] =
    room.examMachines.asScala.filterNot(_.outOfService).toList

  /** A published exam open for a month, owned by `owner` only */
  private def exam(id: Long, owner: User): Exam =
    ensureTestDataLoaded()
    val e = DB.find(classOf[Exam], id)
    e.state = ExamState.PUBLISHED
    e.periodEnd = Instant.now().plus(30, DAYS)
    e.creator = owner
    e.shared = false
    e.anonymous = false
    e.examOwners.clear()
    e.examOwners.add(owner)
    e.update()
    e.examInspections.forEach(_.delete())
    e

  private def clean(): Unit =
    ensureTestDataLoaded()
    // The test data puts participations straight on the exams, unlike real student copies
    DB.find(classOf[ExamParticipation]).list.foreach(_.delete())
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())
    DB.find(classOf[Reservation]).list.foreach(_.delete())

  private def reservation(
      e: Exam,
      start: Instant,
      machine: ExamMachine = machines.head,
      who: User = student
  ): (ExamEnrolment, Reservation) =
    val r = new Reservation
    r.user = who
    r.machine = machine
    r.startAt = start
    r.endAt = start.plus(2, HOURS)
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = who
    enrolment.reservation = r
    enrolment.save()
    (enrolment, r)

  private def event(e: Exam, start: Instant): ExamEnrolment =
    val ee = new ExaminationEvent
    ee.start = start
    ee.description = "Event"
    ee.capacity = 10
    ee.save()
    val config = new ExaminationEventConfiguration
    config.exam = e
    config.examinationEvent = ee
    config.hash = UUID.randomUUID().toString
    config.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.user = student
    enrolment.examinationEventConfiguration = config
    enrolment.save()
    enrolment

  private def call(method: String, url: String, session: Session): Result =
    runIO(makeRequest(method, url, session = session))

  private def ids(result: Result): Seq[Long] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toSeq.map(j => (j \ "id").as[Long])

  private def names(result: Result): Seq[String] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toSeq.map(j => (j \ "name").as[String])

  "Reservation lookups" when:
    "looking up exams" should:
      "give a teacher only their own exams still open" in:
        val (_, session) = runIO(loginAsTeacher())
        val own          = exam(1, olli)
        val others       = exam(2, arvon)

        ids(call("GET", "/app/reservations/exams", session)) must (contain(own.id) and not contain
          others.id)

        own.periodEnd = Instant.now().minus(1, DAYS)
        own.update()
        ids(call("GET", "/app/reservations/exams", session)) must not contain own.id

      "give an administrator every published exam, by name" in:
        val (_, session) = runIO(loginAsAdmin())
        val first        = exam(1, olli)
        val second       = exam(2, arvon)

        ids(call("GET", "/app/reservations/exams", session)) must contain allOf (
          first.id,
          second.id
        )
        val byName = ids(call("GET", "/app/reservations/exams?filter=Astronomian", session))
        byName must not contain first.id

    "looking up rooms and people" should:
      "give the rooms with their machines" in:
        val (_, session) = runIO(loginAsAdmin())
        ensureTestDataLoaded()

        val result = call("GET", "/app/reservations/examrooms", session)
        statusOf(result) must be(Status.OK)
        val pegasus = contentAsJsonOf(result).as[JsArray].value
          .find(r => (r \ "id").as[Long] == room.id)
          .get
        (pegasus \ "examMachines").as[JsArray].value.size must be(room.examMachines.size)

      "find students and teachers by name" in:
        val (_, session) = runIO(loginAsAdmin())
        ensureTestDataLoaded()

        names(call("GET", "/app/reservations/students?filter=Sauli", session)) must contain(
          "Sauli Student"
        )
        val teachers = names(call("GET", "/app/reservations/teachers?filter=Penaali", session))
        teachers must be(Seq("Arvon Penaali"))

  "Listing reservations" when:
    "an administrator filters them" should:
      "narrow them down by room, machine, exam, student, time and state" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val tomorrow      = Instant.now().plus(1, DAYS)
        val (_, first)    = reservation(exam(1, olli), tomorrow, machines.head)
        val (missed, old) = reservation(exam(2, arvon), tomorrow.minus(7, DAYS), machines(1))
        missed.noShow = true
        missed.update()
        def listed(query: String) = ids(call("GET", s"/app/reservations$query", session)).toSet

        listed("") must be(Set(first.id.longValue, old.id.longValue))
        listed(s"?roomId=${room.id}") must be(Set(first.id.longValue, old.id.longValue))
        listed(s"?machineId=${machines(1).id}") must be(Set(old.id.longValue))
        listed("?examId=1") must be(Set(first.id.longValue))
        listed(s"?ownerId=${arvon.id}") must be(Set(old.id.longValue))
        listed(s"?studentId=${student.id}").size must be(2)
        listed(s"?start=${tomorrow.minus(1, HOURS)}&end=${tomorrow.plus(3, HOURS)}") must be(
          Set(first.id.longValue)
        )
        listed("?state=NO_SHOW") must be(Set(old.id.longValue))
        listed("?state=PUBLISHED") must be(Set(first.id.longValue))

    "a teacher lists them" should:
      "see only the reservations of their own exams" in:
        val (_, session) = runIO(loginAsTeacher())
        clean()
        val tomorrow   = Instant.now().plus(1, DAYS)
        val (_, own)   = reservation(exam(1, olli), tomorrow, machines.head)
        val (_, other) = reservation(exam(2, arvon), tomorrow, machines(1))

        ids(call("GET", "/app/reservations", session)) must be(Seq(own.id.longValue))
        other.id must not be own.id

      "not find a student's reservations to an anonymous exam" in:
        val (_, session) = runIO(loginAsTeacher())
        clean()
        val e        = exam(1, olli)
        val (_, own) = reservation(e, Instant.now().plus(1, DAYS))
        val url      = s"/app/reservations?studentId=${student.id}"

        ids(call("GET", url, session)) must be(Seq(own.id.longValue))
        e.anonymous = true
        e.update()
        ids(call("GET", url, session)) must be(empty)
        ids(call("GET", "/app/reservations", session)) must be(Seq(own.id.longValue))

    "listing examination events" should:
      "give a teacher the events of their own exams, ending by the given time" in:
        val (_, session) = runIO(loginAsTeacher())
        clean()
        val start     = Instant.now().plus(1, DAYS)
        val e         = exam(1, olli)
        val own       = event(e, start)
        val otherExam = event(exam(2, arvon), start)

        ids(call("GET", "/app/events", session)) must be(Seq(own.id.longValue))
        otherExam.id must not be own.id
        // The exam takes its full duration after the start
        val endsBy = start.plusSeconds(e.duration.toLong * 60)
        ids(call("GET", s"/app/events?end=${endsBy.plusSeconds(1)}", session)) must be(
          Seq(own.id.longValue)
        )
        ids(call("GET", s"/app/events?end=${endsBy.minusSeconds(60)}", session)) must be(empty)
        ids(call("GET", s"/app/events?start=${start.plusSeconds(1)}", session)) must be(empty)

  "Removing a reservation" when:
    "an administrator removes one" should:
      "remove a reservation still to come, keeping the enrolment" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val (enrolment, booked) = reservation(exam(1, olli), Instant.now().plus(1, DAYS))

        statusOf(call("DELETE", s"/app/reservations/${booked.id}?msg=Room%20closed", session)) must
          be(Status.OK)
        Option(DB.find(classOf[Reservation], booked.id)) must be(None)
        DB.find(classOf[ExamEnrolment], enrolment.id).reservation must be(null)

      "keep a reservation once the exam has been taken" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val (enrolment, booked) = reservation(exam(1, olli), Instant.now().minus(1, DAYS))
        val participation       = new ExamParticipation
        participation.exam = enrolment.exam
        participation.user = student
        participation.save()

        val result = call("DELETE", s"/app/reservations/${booked.id}", session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_unable_to_remove_reservation")
        Option(DB.find(classOf[Reservation], booked.id)) must not be empty

      "remove a past reservation of a visiting student" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val visit = new Reservation
        visit.machine = machines.head
        visit.startAt = Instant.now().minus(3, DAYS)
        visit.endAt = visit.startAt.plus(2, HOURS)
        visit.externalUserRef = "visitor@other.fi"
        visit.save()

        statusOf(call("DELETE", s"/app/reservations/${visit.id}", session)) must be(Status.OK)
        Option(DB.find(classOf[Reservation], visit.id)) must be(None)

      "answer 404 for an unknown reservation" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(call("DELETE", "/app/reservations/999999", session)) must be(Status.NOT_FOUND)

  "Changing the machine" when:
    "the request cannot be met" should:
      "refuse a visiting student's reservation" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val (_, booked) = reservation(exam(1, olli), Instant.now().plus(1, DAYS))
        booked.externalUserRef = "visitor@other.fi"
        booked.update()

        // No machines are offered; this endpoint answers 404 where the change itself answers 403
        statusOf(call("GET", s"/app/reservations/${booked.id}/${room.id}/machines", session)) must
          be(Status.NOT_FOUND)
        statusOf(runIO(put(
          s"/app/reservations/${booked.id}/machine",
          Json.obj("machineId" -> machines(1).id.longValue),
          session
        ))) must be(Status.FORBIDDEN)

      "answer 404 for what is not there" in:
        val (_, session) = runIO(loginAsAdmin())
        clean()
        val (_, booked) = reservation(exam(1, olli), Instant.now().plus(1, DAYS))

        statusOf(call("GET", s"/app/reservations/999999/${room.id}/machines", session)) must be(
          Status.NOT_FOUND
        )
        statusOf(call("GET", s"/app/reservations/${booked.id}/999999/machines", session)) must be(
          Status.NOT_FOUND
        )
        statusOf(runIO(put(
          s"/app/reservations/${booked.id}/machine",
          Json.obj("machineId" -> 999999),
          session
        ))) must be(Status.NOT_FOUND)
