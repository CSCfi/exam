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
import play.api.libs.json.{JsObject, JsValue, Json}
import services.json.EbeanMapper

import scala.jdk.StreamConverters.*

/** The assessment document lives in XM's CouchDB, which rejects a write carrying anything but the
  * document's current revision ("Document update conflict"). These specs pin down that the revision
  * EXAM writes back with is the one it just read from XM, not one the client sent along - a
  * client's revision goes stale as soon as anything else writes to the assessment, which for a
  * grading teacher happens on every debounced answer score autosave.
  */
class CollaborativeReviewRevisionSpec extends BaseIntegrationSpec with BeforeAndAfterAll
    with Matchers:

  private val examRef         = "0e6d16c51f857a20ab578f57f105032e"
  private val assessmentRef   = "assessment-1"
  private val currentRevision = "5-currentrevision"
  private val staleRevision   = "2-staleclientrevision"

  private lazy val server = new Server(31247)
  private val assessments = new AssessmentServlet

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
    "the client sends a revision that has gone stale" should:
      "score an answer using the revision read from XM" in:
        val ce           = setup()
        val url          = s"/app/iop/reviews/${ce.id}/$assessmentRef/question/$questionId"
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(
          put(url, Json.obj("evaluatedScore" -> 2.5, "rev" -> staleRevision), session)
        )

        statusOf(result) must be(Status.OK)
        revisionSentToXm must be(currentRevision)
        scoreOfQuestion(questionId) must be(Some(2.5))

      "force score an answer using the revision read from XM" in:
        val ce           = setup()
        val url          = s"/app/iop/reviews/${ce.id}/$assessmentRef/question/$questionId/force"
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(
          put(url, Json.obj("forcedScore" -> 3, "rev" -> staleRevision), session)
        )

        statusOf(result) must be(Status.OK)
        revisionSentToXm must be(currentRevision)
        (lastPut \ "exam" \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "forcedScore")
          .as[Double] must be(3.0)

      "save the feedback comment using the revision read from XM" in:
        val ce           = setup()
        val url          = s"/app/iop/reviews/${ce.id}/$assessmentRef/comment"
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(
          put(url, Json.obj("comment" -> "Well argued", "rev" -> staleRevision), session)
        )

        statusOf(result) must be(Status.OK)
        revisionSentToXm must be(currentRevision)
        (lastPut \ "exam" \ "examFeedback" \ "comment").as[String] must be("Well argued")

      "lock the assessment using the revision read from XM" in:
        val ce           = setup()
        val url          = s"/app/iop/reviews/${ce.id}/$assessmentRef/record"
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(
          put(url, Json.obj("gradingType" -> "GRADED", "rev" -> staleRevision), session)
        )

        statusOf(result) must be(Status.OK)
        revisionSentToXm must be(currentRevision)
        (lastPut \ "exam" \ "state").as[String] must be("GRADED_LOGGED")

    "the client sends no revision at all" should:
      "still lock the assessment" in:
        val ce           = setup()
        val url          = s"/app/iop/reviews/${ce.id}/$assessmentRef/record"
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(put(url, Json.obj("gradingType" -> "GRADED"), session))

        statusOf(result) must be(Status.OK)
        revisionSentToXm must be(currentRevision)

  private def questionId: Long =
    (assessments.document \ "exam" \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "id").as[Long]

  private def lastPut: JsValue =
    assessments.lastPutBody.getOrElse(fail("Nothing was sent to XM"))

  private def revisionSentToXm: String =
    (lastPut \ "rev").asOpt[String].getOrElse(fail("No revision sent to XM"))

  private def scoreOfQuestion(qid: Long): Option[Double] =
    (lastPut \ "exam" \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "essayAnswer")
      .asOpt[JsObject]
      .flatMap(a => (a \ "evaluatedScore").asOpt[Double])

  private def setup(): CollaborativeExam =
    ensureTestDataLoaded()
    val exam = Option(DB.find(classOf[Exam], 1L)).getOrElse(fail("Test exam not found"))
    exam.executionType = Option(DB.find(classOf[ExamExecutionType], 1L)).orNull

    val mapper   = EbeanMapper.create()
    val examJson = Json.parse(mapper.writeValueAsString(exam)).as[JsObject]
    // Graded and ready to be locked, so that the state checks guarding the endpoints pass
    val gradedExam = examJson ++ Json.obj(
      "state"          -> "GRADED",
      "gradingType"    -> "GRADED",
      "answerLanguage" -> "fi",
      "creditType"     -> Json.obj("id" -> 1, "type" -> "FINAL"),
      "grade"          -> Json.obj("id" -> 1, "name" -> "1", "marksRejection" -> false),
      "gradedByUser"   -> Json.obj("id" -> 1, "email" -> "admin@funet.fi")
    ) - "examRecord"

    assessments.document = Json.obj(
      "_id"    -> assessmentRef,
      "_rev"   -> currentRevision,
      "type"   -> "assessment",
      "examId" -> examRef,
      "exam"   -> gradedExam
    )
    assessments.lastPutBody = None

    val ce = new CollaborativeExam()
    ce.externalRef = examRef
    ce.save()
    ce

/** Stands in for XM: serves one assessment document and records what gets written back. */
private class AssessmentServlet extends HttpServlet:
  @volatile var document: JsObject           = Json.obj()
  @volatile var lastPutBody: Option[JsValue] = None

  override protected def doGet(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    RemoteServerHelper.writeJsonResponse(resp, document, HttpServletResponse.SC_OK)

  override protected def doPut(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    lastPutBody = Some(Json.parse(req.getReader.lines().toScala(LazyList).mkString))
    RemoteServerHelper.writeJsonResponse(
      resp,
      Json.obj("ok" -> true, "id" -> (document \ "_id").as[String], "rev" -> "6-nextrevision"),
      HttpServletResponse.SC_OK
    )
