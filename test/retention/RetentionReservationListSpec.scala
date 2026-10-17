// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import features.retention.services.RetentionRepository
import helpers.InstantArithmetic.*
import io.ebean.DB
import models.enrolment.*
import models.exam.{Exam, ExamState}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.Session

import java.time.Instant
import scala.jdk.CollectionConverters.*

/** A student copy stripped by retention is listed as deleted until its booking is removed. */
class RetentionReservationListSpec extends RetentionSpecBase:

  private lazy val repository = app.injector.instanceOf(classOf[RetentionRepository])

  private def window(at: Instant) =
    s"start=${at.minusDays(1)}&end=${at.plusDays(1)}"

  private def owned(teacher: User): Exam =
    val exam = prototype()
    if !exam.examOwners.asScala.exists(_.id == teacher.id) then
      exam.examOwners.add(teacher)
      exam.update()
    exam

  private def listed(url: String, session: Session): Map[Long, String] =
    val result = runIO(get(url, session = session))
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.toList.map { r =>
      val enrolment = (r \ "enrolment").toOption.getOrElse(r)
      (enrolment \ "exam" \ "id").as[Long] -> (enrolment \ "exam" \ "state").as[String]
    }.toMap

  private def reservations(at: Instant, session: Session) =
    listed(s"/app/reservations?${window(at)}", session)

  "Listing reservations" should:
    "show a stripped attempt as deleted to its teacher and to admins" in:
      setup()
      val (teacher, teacherSession) = runIO(loginAsTeacher())
      val (_, adminSession)         = runIO(loginAsAdmin())
      owned(teacher)
      val at = t0.plusDays(40)
      val a  = attempt(newUser("listed", at, models.user.Role.Name.STUDENT), at)

      repository.stripAttempt(a.copy.id)

      reservations(at, teacherSession).get(a.copy.id.longValue) mustBe Some("DELETED")
      reservations(at, adminSession).get(a.copy.id.longValue) mustBe Some("DELETED")

    "keep hiding bookings on an exam the teacher deleted" in:
      setup()
      val (teacher, teacherSession) = runIO(loginAsTeacher())
      val at                        = t0.plusDays(50)
      val student                   = newUser("deleted-exam", at, models.user.Role.Name.STUDENT)
      val exam                      = new Exam
      exam.name = "Deleted by its teacher"
      exam.state = ExamState.DELETED
      exam.save()
      exam.examOwners.add(teacher)
      exam.update()
      val reservation = new Reservation
      reservation.startAt = at
      reservation.endAt = at.plusHours(2)
      reservation.user = student
      reservation.save()
      val enrolment = new ExamEnrolment
      enrolment.user = student
      enrolment.exam = exam
      enrolment.reservation = reservation
      enrolment.save()

      reservations(at, teacherSession).keySet must not contain exam.id.longValue

    "show a stripped examination event attempt as deleted when filtered by exam" in:
      setup()
      val (teacher, teacherSession) = runIO(loginAsTeacher())
      val (_, adminSession)         = runIO(loginAsAdmin())
      val exam                      = owned(teacher)
      val at                        = t0.plusDays(60)
      val a     = attempt(newUser("event", at, models.user.Role.Name.STUDENT), at)
      val event = new ExaminationEvent
      event.start = at
      event.capacity = 10
      event.save()
      val config = new ExaminationEventConfiguration
      config.exam = exam
      config.examinationEvent = event
      config.save()
      val enrolment = DB.find(classOf[ExamEnrolment], a.enrolment.id)
      enrolment.reservation = null
      enrolment.examinationEventConfiguration = config
      enrolment.update()

      repository.stripAttempt(a.copy.id)

      val url = s"/app/events?examId=${exam.id}&${window(at)}"
      listed(url, teacherSession).get(a.copy.id.longValue) mustBe Some("DELETED")
      listed(url, adminSession).get(a.copy.id.longValue) mustBe Some("DELETED")
