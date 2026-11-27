// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.exam.{Exam, ExamState}
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.JsArray

import scala.compiletime.uninitialized

class EnrolmentInterfaceSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with EbeanQueryExtensions:

  private var server: Server         = uninitialized
  private var emptyResponse: Boolean = false

  class CourseInfoServlet extends HttpServlet:
    @volatile private var receivedApiKey: Option[String] = None

    def lastReceivedApiKey: Option[String] = receivedApiKey
    def resetReceivedApiKey(): Unit        = receivedApiKey = None

    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      receivedApiKey = Option(request.getHeader("X-Api-Key"))
      if emptyResponse then RemoteServerHelper.writeEmptyJsonResponse(response)
      else RemoteServerHelper.writeResponseFromFile(response, "test/resources/enrolments.json")

  private lazy val courseInfoServlet = new CourseInfoServlet()

  override def beforeAll(): Unit =
    super.beforeAll()
    val binding = ServletDef.FromInstance(courseInfoServlet) -> List("/enrolments")
    server = RemoteServerHelper.createServer(31246, multipart = false, binding)

  override def afterAll(): Unit =
    try
      RemoteServerHelper.shutdownServer(server)
    finally
      super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    emptyResponse = false
    courseInfoServlet.resetReceivedApiKey()

  private def setupExamData(): Unit =
    // Fake API shall return a course with code 810136P. Let's make a referenced exam active in the DB so it should
    // pop up in the search results
    DB
      .find(classOf[Exam])
      .where()
      .eq("course.code", "810136P")
      .eq("state", ExamState.PUBLISHED)
      .find
      .foreach(exam =>
        exam.periodStart = DateTime.now().minusDays(1)
        exam.periodEnd = DateTime.now().plusDays(1)
        exam.save()
      );

  "EnrolmentInterface" when:
    "listing exams" should:
      "return exams for enrolled courses" in:
        val (user, session) = runIO(loginAsStudent())
        setupExamData()

        val result = runIO(get("/app/student/exams", session = session))
        statusOf(result).must(be(Status.OK))

        val examsJson = contentAsJsonOf(result).as[JsArray]
        examsJson.value must have size 1

        val examId = (examsJson.value.head \ "id").as[Long]
        val exam   = DB.find(classOf[Exam], examId)
        exam.course.code must be("810136P")

      "return empty list when no remote enrolments" in:
        val (user, session) = runIO(loginAsStudent())
        setupExamData()
        emptyResponse = true

        val result = runIO(get("/app/student/exams", session = session))
        statusOf(result).must(be(Status.OK))

        val examsJson = contentAsJsonOf(result).as[JsArray]
        examsJson.value must be(empty)

      "include configured api key header in outbound requests" in:
        val (_, session) = runIO(loginAsStudent())
        setupExamData()

        runIO(get("/app/student/exams", session = session))

        courseInfoServlet.lastReceivedApiKey must be(Some("test-secret"))
