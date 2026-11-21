// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.enrolment.{ExamEnrolment, Reservation}
import models.facility.ExamMachine
import models.iop.CollaborativeExam
import models.user.User
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.temporal.ChronoUnit
import java.time.{Instant, LocalDate, ZoneOffset}

/** A student taking part in a collaborative exam: finding it, enrolling and booking a slot. */
class CollaborativeEnrolmentSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with EbeanQueryExtensions:

  private val Port  = 31254
  private val store = new FakeXmExamStore

  /** XM's per-student list of assessments */
  private object FinishedExams extends HttpServlet:
    @volatile var eppn: Option[String] = None
    override def doGet(req: HttpServletRequest, resp: HttpServletResponse): Unit =
      eppn = Option(req.getParameter("eppn"))
      resp.setContentType("application/json")
      resp.getWriter.write(Json.arr(Json.obj("_id" -> "a1")).toString)

  private var server: Option[Server] = None

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.integration.iop.host" -> s"http://localhost:$Port")

  override def beforeAll(): Unit =
    super.beforeAll()
    server = Some(RemoteServerHelper.createServer(
      Port,
      false,
      ServletDef.FromInstance(store)         -> List("/api/exams/*"),
      ServletDef.FromInstance(FinishedExams) -> List("/api/assessments/*")
    ))

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    store.reset()

  /** A published exam open for enrolment, created through the API */
  private def publishedExam(
      name: String = "Shared exam",
      changes: JsObject = Json.obj()
  ): CollaborativeExam =
    val (_, session) = runIO(loginAsAdmin())
    val result       = runIO(post("/app/iop/exams", session))
    statusOf(result).must(be(Status.CREATED))
    val ce        = DB.find(classOf[CollaborativeExam], (contentAsJsonOf(result) \ "id").as[Long])
    val periodEnd = Instant.now().plus(7, ChronoUnit.DAYS).toEpochMilli
    store.update(ce.externalRef)(_ ++ Json.obj(
      "name"      -> name,
      "state"     -> "PUBLISHED",
      "periodEnd" -> periodEnd
    ) ++ changes)
    ce

  private def student(): User =
    DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find.get

  private def enrolments(ce: CollaborativeExam): List[ExamEnrolment] =
    DB.find(classOf[ExamEnrolment]).where().eq("collaborativeExam.id", ce.id).list

  private def enrol(ce: CollaborativeExam, session: Session): Result =
    runIO(post(s"/app/iop/enrolments/${ce.id}", session))

  // Tomorrow 10-11 UTC, when the test room is open
  private val tomorrow      = LocalDate.now(ZoneOffset.UTC).plusDays(1)
  private def at(hour: Int) = tomorrow.atTime(hour, 0).toInstant(ZoneOffset.UTC)

  private def reserve(ce: CollaborativeExam, session: Session): Result =
    val body = Json.obj(
      "roomId" -> 1,
      "examId" -> ce.id.longValue,
      "start"  -> at(10).toString,
      "end"    -> at(11).toString
    )
    runIO(makeRequest("POST", "/app/iop/calendar/reservation", Some(body), session = session))

  "CollaborativeEnrolmentController" when:
    "searching exams" should:
      "list the published exams open for enrolment" in:
        publishedExam("Open exam")
        publishedExam("Closed exam", Json.obj("state" -> "DRAFT"))
        publishedExam("Elsewhere", Json.obj("organisations" -> "other-org"))
        val (_, session) = runIO(loginAsStudent())

        val result = runIO(get("/app/iop/enrolment", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(e => (e \ "name").as[String])
          .must(be(Seq("Open exam")))

    "enrolling" should:
      "create an enrolment" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        statusOf(enrol(ce, session)).must(be(Status.OK))
        enrolments(ce).map(_.user.id).must(be(List(student().id)))

      "refuse a second enrolment" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        enrol(ce, session)
        val result = enrol(ce, session)
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).must(be("i18n_error_enrolment_exists"))
        enrolments(ce).size.must(be(1))

      "refuse an exam that is not published" in:
        val ce           = publishedExam(changes = Json.obj("state" -> "DRAFT"))
        val (_, session) = runIO(loginAsStudent())
        contentAsStringOf(enrol(ce, session)).must(be("i18n_error_exam_not_found"))
        enrolments(ce).must(be(empty))

      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(post("/app/iop/enrolments/999", session))).must(be(Status.FORBIDDEN))

    "checking enrolments" should:
      "list the student's enrolments to the exam" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        enrol(ce, session)

        val result = runIO(get(s"/app/iop/enrolments/exam/${ce.id}", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].size.must(be(1))

  "CollaborativeCalendarController" when:
    "getting exam info" should:
      "leave out the questions" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())

        val result = runIO(get(s"/app/iop/exams/${ce.id}/info", session = session))
        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        (json \ "id").as[Long].must(be(ce.id.longValue))
        (json \ "name").as[String].must(be("Shared exam"))
        val sections = (json \ "examSections").as[Seq[JsObject]]
        sections.size.must(be(1))
        sections.head.keys.must(not(contain("sectionQuestions")))

      "answer 404 for an unknown exam" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(get("/app/iop/exams/999/info", session = session))).must(be(
          Status.NOT_FOUND
        ))

    "getting slots" should:
      "require an enrolment" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        val result =
          runIO(get(s"/app/iop/exams/${ce.id}/calendar/1?day=$tomorrow", session = session))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).must(be("i18n_error_enrolment_not_found"))

      "list them for an enrolled student" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        enrol(ce, session)
        statusOf(runIO(get(s"/app/iop/exams/${ce.id}/calendar/1?day=$tomorrow", session = session)))
          .must(be(Status.OK))

    "reserving a slot" should:
      "book a machine for the enrolment" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        enrol(ce, session)

        statusOf(reserve(ce, session)).must(be(Status.OK))
        val reservation = enrolments(ce).head.reservation
        (reservation.startAt, reservation.endAt).must(be((at(10), at(11))))
        DB.find(classOf[ExamMachine], reservation.machine.id).room.id.longValue.must(be(1L))

      "replace the enrolment's earlier reservation" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        enrol(ce, session)
        reserve(ce, session)
        val first = enrolments(ce).head.reservation.id

        statusOf(reserve(ce, session)).must(be(Status.OK))
        Option(DB.find(classOf[Reservation], first)).must(be(None))
        enrolments(ce).map(_.reservation).size.must(be(1))

      "require an enrolment" in:
        val ce           = publishedExam()
        val (_, session) = runIO(loginAsStudent())
        statusOf(reserve(ce, session)).must(be(Status.FORBIDDEN))

  "CollaborativeStudentActionController" when:
    "listing finished exams" should:
      "fetch the student's assessments from XM" in:
        val (user, session) = runIO(loginAsStudent())
        val result          = runIO(get("/app/iop/student/finishedExams", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(a => (a \ "_id").as[String]).must(be(
          Seq("a1")
        ))
        FinishedExams.eppn.must(be(Some(user.eppn)))
