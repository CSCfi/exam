// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import helpers.RemoteServerHelper
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import miscellaneous.scala.DbApiHelper
import models.exam.Exam
import org.eclipse.jetty.server.Server
import org.joda.time.DateTime
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.JsArray
import play.api.test.Helpers.*

import scala.jdk.CollectionConverters.*
import scala.compiletime.uninitialized

class EnrolmentInterfaceSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with DbApiHelper:

  private var server: Server         = uninitialized
  private var emptyResponse: Boolean = false

  class CourseInfoServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      if emptyResponse then RemoteServerHelper.writeEmptyJsonResponse(response)
      else RemoteServerHelper.writeResponseFromFile(response, "test/resources/enrolments.json")

  override def beforeAll(): Unit =
    super.beforeAll()
    server = RemoteServerHelper.createAndStartServer(
      31246,
      Map(classOf[CourseInfoServlet] -> List("/enrolments"))
    )

  override def afterAll(): Unit =
    try
      RemoteServerHelper.shutdownServer(server)
    finally
      super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    emptyResponse = false

  private def setupExamData(): Unit =
    // Fake API shall return a course with code 810136P. Let's make a referenced exam active in the DB so it should
    // pop up in the search results
    DB
      .find(classOf[Exam])
      .where()
      .eq("course.code", "810136P")
      .eq("state", Exam.State.PUBLISHED)
      .find
      .foreach(exam =>
        exam.setPeriodStart(DateTime.now().minusDays(1))
        exam.setPeriodEnd(DateTime.now().plusDays(1))
        exam.save()
      );

  "EnrolmentInterface" when:
    "listing exams" should:
      "return exams for enrolled courses" in:
        loginAsStudent().map { case (user, session) =>
          setupExamData()

          val result = get("/app/student/exams", session = session)
          status(result).must(be(Status.OK))

          val examsJson = contentAsJson(result).as[JsArray]
          examsJson.value must have size 1

          val examId = (examsJson.value.head \ "id").as[Long]
          val exam   = DB.find(classOf[Exam], examId)
          exam.getCourse.getCode must be("810136P")
        }

      "return empty list when no remote enrolments" in:
        loginAsStudent().map { case (user, session) =>
          setupExamData()
          emptyResponse = true

          val result = get("/app/student/exams", session = session)
          status(result).must(be(Status.OK))

          val examsJson = contentAsJson(result).as[JsArray]
          examsJson.value must be(empty)
        }
