// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import helpers.RemoteServerHelper
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import models.exam.{Exam, ExamExecutionType}
import models.iop.CollaborativeExam
import org.eclipse.jetty.ee10.servlet.{ServletContextHandler, ServletHolder}
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.must.Matchers
import play.api.http.Status
import play.api.libs.json.{JsArray, JsObject, Json}
import play.api.test.Helpers.POST
import services.json.EbeanMapper

/** The locked attempts of a collaborative exam are exported to CSV by posting the selected
  * assessment refs. The client sends them the way file downloads send their params, as `{"params":
  * {"ids": "ref1,ref2"}}`.
  */
class CollaborativeReviewExportSpec extends BaseIntegrationSpec with BeforeAndAfterAll
    with Matchers:

  private val examRef = "0e6d16c51f857a20ab578f57f105032e"

  private lazy val server = new Server(31247)
  private val assessments = new AssessmentListServlet

  override def beforeAll(): Unit =
    super.beforeAll()
    val context = new ServletContextHandler(ServletContextHandler.SESSIONS)
    context.setContextPath("/api")
    context.addServlet(new ServletHolder(assessments), "/exams/*")
    server.setHandler(context)
    server.start()

  override def afterAll(): Unit =
    try RemoteServerHelper.shutdownServer(server)
    finally super.afterAll()

  "CollaborativeReviewController" when:
    "exporting selected locked assessments" should:
      "write a row for each selected assessment" in:
        val ce           = setup("locked-1", "locked-2", "locked-3")
        val (_, session) = runIO(loginAsAdmin())
        val body         = Json.obj("params" -> Json.obj("ids" -> "locked-1,locked-3"))
        val result =
          runIO(makeRequest(POST, s"/app/iop/reviews/${ce.id}", Some(body), session = session))

        statusOf(result) must be(Status.OK)
        val lines = contentAsStringOf(result).linesIterator.filter(_.nonEmpty).toList
        lines must have size 3
        lines.tail.map(_.split(",").head.replace("\"", "")) must contain theSameElementsAs Seq(
          "locked-1",
          "locked-3"
        )

  private def setup(refs: String*): CollaborativeExam =
    ensureTestDataLoaded()
    val exam = Option(DB.find(classOf[Exam], 1L)).getOrElse(fail("Test exam not found"))
    exam.executionType = Option(DB.find(classOf[ExamExecutionType], 1L)).orNull

    val mapper   = EbeanMapper.create()
    val examJson = Json.parse(mapper.writeValueAsString(exam)).as[JsObject]
    val lockedExam = examJson ++ Json.obj(
      "state"          -> "GRADED_LOGGED",
      "gradingType"    -> "GRADED",
      "answerLanguage" -> "fi",
      "customCredit"   -> 5,
      "creditType"     -> Json.obj("id" -> 1, "type" -> "FINAL"),
      "grade"          -> Json.obj("id" -> 1, "name" -> "1", "marksRejection" -> false),
      "gradedByUser"   -> Json.obj("id" -> 1, "email" -> "admin@funet.fi")
    ) - "examRecord"

    assessments.documents = JsArray(refs.map { ref =>
      Json.obj(
        "_id"    -> ref,
        "_rev"   -> "1-revision",
        "type"   -> "assessment",
        "examId" -> examRef,
        "user"   -> Json.obj("firstName" -> "Sam", "lastName" -> "Student"),
        "exam"   -> lockedExam
      )
    })

    val ce = new CollaborativeExam()
    ce.externalRef = examRef
    ce.save()
    ce

/** Stands in for XM: serves the assessments of one exam. */
private class AssessmentListServlet extends HttpServlet:
  @volatile var documents: JsArray = JsArray()

  override protected def doGet(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    RemoteServerHelper.writeJsonResponse(resp, documents, HttpServletResponse.SC_OK)
