// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper.ServletDef
import helpers.{ExamServlet, RemoteServerHelper}
import io.ebean.DB
import models.exam.{Exam, ExamState}
import models.iop.CollaborativeExam
import models.questions.{Question, QuestionType}
import models.sections.ExamSectionQuestion
import models.user.User
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.must.Matchers
import play.api.Application
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.JsArray

import scala.jdk.CollectionConverters.*

/** Covers editing and previewing a collaborative exam, with XM stood in for by [[ExamServlet]],
  * which keeps whatever exam was last uploaded and serves it back on download.
  */
class CollaborativeExamSectionControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with Matchers
    with EbeanQueryExtensions:

  private val EXAM_REF = "7c2e5d3a8ff7a20ab578f57f1018abcd"
  private val PORT     = 31249

  private val examServlet            = new ExamServlet()
  private var server: Option[Server] = None

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .configure(Map("exam.integration.iop.host" -> s"http://localhost:$PORT"))
      .build()

  override def beforeAll(): Unit =
    super.beforeAll()
    val bindings = Seq(ServletDef.FromInstance(examServlet) -> List("/api/exams/*"))
    server = Some(RemoteServerHelper.createServer(PORT, false, bindings*))

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  private def findUser(eppn: String): User =
    DB.find(classOf[User]).where().eq("eppn", eppn).find match
      case Some(u) => u
      case None    => fail(s"User $eppn not found")

  /** Puts a published exam owned by the teacher into XM, with a cloze question in its first
    * section.
    */
  private def setupCollaborativeExam(): CollaborativeExam =
    ensureTestDataLoaded()
    val exam = Option(
      DB.find(classOf[Exam]).fetch("examSections").where().idEq(1L).findOne()
    ) match
      case Some(e) => e
      case None    => fail("Test exam not found")
    exam.state = ExamState.PUBLISHED
    exam.organisations = null
    exam.examOwners = new java.util.HashSet(List(findUser("teacher@funet.fi")).asJava)

    val cloze = DB
      .find(classOf[Question])
      .where()
      .eq("type", QuestionType.ClozeTestQuestion)
      .list
      .headOption match
      case Some(q) => q
      case None    => fail("Cloze test question not found")
    val esq = new ExamSectionQuestion()
    esq.id = 987654321L
    esq.question = cloze
    esq.maxScore = 4.0
    esq.sequenceNumber = 0
    val section = exam.examSections.asScala.minBy(_.sequenceNumber)
    section.sectionQuestions = new java.util.HashSet(List(esq).asJava)
    examServlet.setExam(exam)

    val ce = new CollaborativeExam()
    ce.externalRef = EXAM_REF
    ce.save()
    ce

  private def addSection(session: play.api.mvc.Session, ce: CollaborativeExam) =
    val sectionsBefore = examServlet.getExam.examSections.size()
    val result         = runIO(post(s"/app/iop/exams/${ce.id}/sections", session))
    statusOf(result) must be(Status.OK)
    examServlet.getExam.examSections.size() must be(sectionsBefore + 1)

  "CollaborativeExamSectionController" when:
    "adding a section" should:
      "allow an admin" in:
        val ce           = setupCollaborativeExam()
        val (_, session) = runIO(loginAsAdmin())
        addSection(session, ce)

      "allow a teacher owning the exam" in:
        val ce           = setupCollaborativeExam()
        val (_, session) = runIO(loginAsTeacher())
        addSection(session, ce)

  "CollaborativeExamController" when:
    "previewing an exam" should:
      "render cloze test questions with their blanks" in:
        val ce           = setupCollaborativeExam()
        val (_, session) = runIO(loginAsTeacher())

        val result = runIO(get(s"/app/iop/exams/${ce.id}/preview", session = session))
        statusOf(result) must be(Status.OK)

        val json = contentAsJsonOf(result)
        (json \ "id").as[Long] must be(ce.id)
        val esqs = (json \ "examSections").as[JsArray].value.flatMap { s =>
          (s \ "sectionQuestions").as[JsArray].value
        }
        val cloze = esqs.find(q => (q \ "id").as[Long] == 987654321L) match
          case Some(q) => q
          case None    => fail("Cloze question missing from preview")
        val content = (cloze \ "clozeTestAnswer" \ "question").as[String]
        content must include("cloze-input")
        // The blanks holding the correct answers must have been replaced
        content must not include "cloze=\"true\""
