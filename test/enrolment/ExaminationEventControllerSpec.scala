// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package enrolment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.calendar.MaintenancePeriod
import models.enrolment.{ExamEnrolment, ExaminationEvent, ExaminationEventConfiguration}
import models.exam.*
import models.user.User
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.{DAYS, HOURS, MINUTES}

class ExaminationEventControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private val MaxParticipants = 100

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.byod.maxConcurrentParticipants" -> MaxParticipants)

  private val later = Instant.now().plus(7, DAYS).truncatedTo(HOURS)

  /** Exam 1 as a 90-minute exam taken in examination events */
  private def byodExam(implementation: ExamImplementation = ExamImplementation.WHATEVER): Exam =
    ensureTestDataLoaded()
    val e = DB.find(classOf[Exam], 1L)
    e.implementation = implementation
    e.state = ExamState.PUBLISHED
    e.duration = 90
    e.update()
    e

  private def body(
      start: Instant,
      capacity: Int = 10,
      description: String = "Morning",
      passwords: Option[(String, String)] = None
  ): JsValue =
    val config = Json.obj(
      "examinationEvent" -> Json.obj(
        "start"       -> start.toString,
        "description" -> description,
        "capacity"    -> capacity
      )
    )
    Json.obj("config" -> passwords.fold(config) { (settings, quit) =>
      config ++ Json.obj("settingsPassword" -> settings, "quitPassword" -> quit)
    })

  private def call(
      method: String,
      url: String,
      session: Session,
      json: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, json, session = session))

  private def create(e: Exam, json: JsValue, session: Session): Result =
    call("POST", s"/app/exam/${e.id}/examinationevents", session, Some(json))

  private def created(result: Result): ExaminationEventConfiguration =
    statusOf(result) must be(Status.OK)
    DB.find(classOf[ExaminationEventConfiguration], (contentAsJsonOf(result) \ "id").as[Long])

  private def refused(result: Result, message: String): Unit =
    statusOf(result) must be(Status.FORBIDDEN)
    contentAsStringOf(result) must be(message)

  private def enrolTo(config: ExaminationEventConfiguration): ExamEnrolment =
    val enrolment = new ExamEnrolment
    enrolment.exam = config.exam
    enrolment.user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get
    enrolment.examinationEventConfiguration = config
    enrolment.save()
    enrolment

  "ExaminationEventController" when:
    "adding an event" should:
      "store it with its details" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()

        val config = created(create(e, body(later, capacity = 25), session))
        config.exam.id must be(e.id)
        config.hash must not be null
        config.examinationEvent.start must be(later)
        config.examinationEvent.capacity must be(25)
        config.examinationEvent.description must be("Morning")

      "encrypt the SEB passwords, handing them back once in plain text" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam(ExamImplementation.CLIENT_AUTH)

        val result = create(e, body(later, passwords = Some("settings-pw" -> "quit-pw")), session)
        val config = created(result)
        (contentAsJsonOf(result) \ "settingsPassword").as[String] must be("settings-pw")
        (contentAsJsonOf(result) \ "quitPassword").as[String] must be("quit-pw")
        config.encryptedSettingsPassword must not be null
        new String(config.encryptedQuitPassword) must not include "quit-pw"
        config.configKey must not be null

      "require both passwords of a SEB exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam(ExamImplementation.CLIENT_AUTH)

        refused(create(e, body(later), session), "no quit password provided")
        val noSettings = Json.obj("config" -> Json.obj(
          "examinationEvent" -> Json.obj(
            "start"       -> later.toString,
            "description" -> "x",
            "capacity"    -> 1
          ),
          "quitPassword" -> "quit-pw"
        ))
        refused(create(e, noSettings, session), "no settings password provided")

      "refuse a start in the past" in:
        val (_, session) = runIO(loginAsTeacher())
        refused(
          create(byodExam(), body(Instant.now().minus(1, HOURS)), session),
          "i18n_error_examination_event_in_the_past"
        )

      "refuse an event overlapping a maintenance period" in:
        val (_, session) = runIO(loginAsTeacher())
        val period       = new MaintenancePeriod
        // Starts during the exam's 90 minutes
        period.startsAt = later.plus(80, MINUTES)
        period.endsAt = later.plus(5, HOURS)
        period.description = "Upgrade"
        period.save()

        refused(
          create(byodExam(), body(later), session),
          "i18n_error_conflicts_with_maintenance_period"
        )

      "keep simultaneous participants within the limit" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        // Ends half an hour into the new one
        created(create(e, body(later.minus(1, HOURS), capacity = 60), session))

        refused(
          create(e, body(later, capacity = MaxParticipants - 59), session),
          "i18n_error_max_capacity_exceeded"
        )
        created(create(e, body(later, capacity = MaxParticipants - 60), session))
        // Once the earlier one is over there is room again
        created(create(e, body(later.plus(31, MINUTES), capacity = 60), session))

      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsTeacher())
        byodExam()
        statusOf(
          call("POST", "/app/exam/999999/examinationevents", session, Some(body(later)))
        ) must be(
          Status.NOT_FOUND
        )

    "changing an event" should:
      "update its details" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        val config       = created(create(e, body(later), session))
        val moved        = later.plus(1, DAYS)

        statusOf(call(
          "PUT",
          s"/app/exam/${e.id}/examinationevents/${config.id}",
          session,
          Some(body(moved, capacity = 5, description = "Afternoon"))
        )) must be(Status.OK)
        val ee = DB.find(classOf[ExaminationEvent], config.examinationEvent.id)
        (ee.start, ee.capacity, ee.description) must be((moved, 5, "Afternoon"))

      "keep the start and passwords once students have enrolled" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam(ExamImplementation.CLIENT_AUTH)
        val config =
          created(create(e, body(later, passwords = Some("settings-pw" -> "quit-pw")), session))
        enrolTo(config)

        val result = call(
          "PUT",
          s"/app/exam/${e.id}/examinationevents/${config.id}",
          session,
          Some(body(later.plus(1, DAYS), capacity = 30, passwords = Some("new-s" -> "new-q")))
        )
        statusOf(result) must be(Status.OK)
        (contentAsJsonOf(result) \ "quitPassword").as[String] must be("quit-pw")
        (contentAsJsonOf(result) \ "settingsPassword").as[String] must be("settings-pw")
        val ee = DB.find(classOf[ExaminationEvent], config.examinationEvent.id)
        (ee.start, ee.capacity) must be((later, 30))
        DB.find(classOf[ExaminationEventConfiguration], config.id).configKey must be(
          config.configKey
        )

      "refuse an event of another exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        val config       = created(create(e, body(later), session))

        statusOf(call(
          "PUT",
          s"/app/exam/2/examinationevents/${config.id}",
          session,
          Some(body(later))
        )) must be(Status.NOT_FOUND)

    "removing an event" should:
      "remove it with its event while nobody has enrolled" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        val config       = created(create(e, body(later), session))

        statusOf(
          call("DELETE", s"/app/exam/${e.id}/examinationevents/${config.id}", session)
        ) must be(
          Status.OK
        )
        Option(DB.find(classOf[ExaminationEventConfiguration], config.id)) must be(None)
        Option(DB.find(classOf[ExaminationEvent], config.examinationEvent.id)) must be(None)

      "keep it once students have enrolled" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        val config       = created(create(e, body(later), session))
        enrolTo(config)

        statusOf(
          call("DELETE", s"/app/exam/${e.id}/examinationevents/${config.id}", session)
        ) must be(
          Status.FORBIDDEN
        )
        Option(DB.find(classOf[ExaminationEventConfiguration], config.id)) must not be empty

    "listing events" should:
      "give the events of published exams starting within the range" in:
        val (_, teacherSession) = runIO(loginAsTeacher())
        val e                   = byodExam()
        val inRange             = created(create(e, body(later), teacherSession))
        val after               = created(create(e, body(later.plus(3, DAYS)), teacherSession))
        val (_, session)        = runIO(loginAsAdmin())

        def listed(query: String): Seq[Long] =
          val result = call("GET", s"/app/examinationevents$query", session)
          statusOf(result) must be(Status.OK)
          contentAsJsonOf(result).as[JsArray].value.toSeq.map(j => (j \ "id").as[Long])

        val range = s"?start=${later.minus(1, DAYS)}&end=${later.plus(1, DAYS)}"
        listed(range) must be(Seq(inRange.id.longValue))
        listed("").toSet must be(Set(inRange.id.longValue, after.id.longValue))

        e.state = ExamState.DRAFT
        e.update()
        listed(range) must be(empty)

      "give the events overlapping a given time" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()
        val overlapping  = created(create(e, body(later), session))
        created(create(e, body(later.plus(2, HOURS)), session))

        // 30 minutes before the first one, for an hour
        val result = call(
          "GET",
          s"/app/examinationevents/conflicting?start=${later.minus(30, MINUTES)}&duration=60",
          session
        )
        statusOf(result) must be(Status.OK)
        contentAsJsonOf(result).as[JsArray].value.map(j => (j \ "id").as[Long]) must be(
          Seq(overlapping.examinationEvent.id.longValue)
        )

    "managing examination dates" should:
      "add and remove a date" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = byodExam()

        val added = call(
          "POST",
          s"/app/exam/${e.id}/examinationdate",
          session,
          Some(Json.obj("date" -> "13/06/30"))
        )
        statusOf(added) must be(Status.OK)
        val id = (contentAsJsonOf(added) \ "id").as[Long]
        Option(DB.find(classOf[ExaminationDate], id)) must not be empty

        statusOf(call("DELETE", s"/app/exam/${e.id}/examinationdate/$id", session)) must be(
          Status.OK
        )
        Option(DB.find(classOf[ExaminationDate], id)) must be(None)
        statusOf(call("DELETE", s"/app/exam/${e.id}/examinationdate/$id", session)) must be(
          Status.NOT_FOUND
        )
