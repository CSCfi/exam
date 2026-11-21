// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import models.iop.CollaborativeExam
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

/** Editing the sections and questions of a collaborative exam stored in XM. */
class CollaborativeSectionEditingSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with EbeanQueryExtensions:

  private val Port                   = 31252
  private val store                  = new FakeXmExamStore
  private var server: Option[Server] = None

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.integration.iop.host" -> s"http://localhost:$Port")

  override def beforeAll(): Unit =
    super.beforeAll()
    server = Some(RemoteServerHelper.createServer(
      Port,
      false,
      ServletDef.FromInstance(store) -> List("/api/exams/*")
    ))

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    store.reset()

  private def send(method: String, path: String, body: JsValue, session: Session): Result =
    runIO(makeRequest(method, path, Some(body), session = session))

  /** A draft with `count` sections, edited by an admin */
  private def examWithSections(count: Int): (CollaborativeExam, Session) =
    val (_, session) = runIO(loginAsAdmin())
    val result       = runIO(post("/app/iop/exams", session))
    statusOf(result).must(be(Status.CREATED))
    val ce = DB.find(classOf[CollaborativeExam], (contentAsJsonOf(result) \ "id").as[Long])
    (1 until count).foreach { _ =>
      statusOf(runIO(post(s"/app/iop/exams/${ce.id}/sections", session))).must(be(Status.OK))
    }
    // Name the sections by their order to follow them around
    sections(ce).zipWithIndex.foreach { case (s, i) =>
      val body = Json.obj("name" -> s"S$i")
      statusOf(runIO(put(s"/app/iop/exams/${ce.id}/sections/${id(s)}", body, session)))
        .must(be(Status.OK))
    }
    (ce, session)

  private def id(json: JsValue): Long = (json \ "id").as[Long]

  private def sections(ce: CollaborativeExam): Seq[JsObject] =
    (store.get(ce.externalRef).get \ "examSections").as[Seq[JsObject]]
      .sortBy(s => (s \ "sequenceNumber").as[Int])

  private def sectionNames(ce: CollaborativeExam): Seq[String] =
    sections(ce).map(s => (s \ "name").as[String])

  private def questions(ce: CollaborativeExam, section: Int = 0): Seq[JsObject] =
    (sections(ce)(section) \ "sectionQuestions").as[Seq[JsObject]]
      .sortBy(q => (q \ "sequenceNumber").as[Int])

  private def questionTexts(ce: CollaborativeExam, section: Int = 0): Seq[String] =
    questions(ce, section).map(q => (q \ "question" \ "question").as[String])

  private def essay(text: String): JsObject = Json.obj(
    "type"                  -> "EssayQuestion",
    "question"              -> text,
    "defaultEvaluationType" -> "Points",
    "defaultMaxScore"       -> 5,
    "questionOwners"        -> Json.arr(Json.obj("id" -> 1, "email" -> "admin@funet.fi")),
    "options"               -> Json.arr()
  )

  private def addQuestion(
      ce: CollaborativeExam,
      session: Session,
      question: JsObject,
      sequence: Int = 0
  ): Result =
    val sectionId = id(sections(ce).head)
    send(
      "POST",
      s"/app/iop/exams/${ce.id}/sections/$sectionId/questions",
      Json.obj("sequenceNumber" -> sequence, "question" -> question),
      session
    )

  private def reorder(path: String, from: Int, to: Int, session: Session): Result =
    send("PUT", path, Json.obj("from" -> from, "to" -> to), session)

  "CollaborativeExamSectionController" when:
    "removing a section" should:
      "renumber the sections after it" in:
        val (ce, session) = examWithSections(3)
        val middle        = id(sections(ce)(1))

        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}/sections/$middle", session)))
          .must(be(Status.OK))
        sectionNames(ce).must(be(Seq("S0", "S2")))
        sections(ce).map(s => (s \ "sequenceNumber").as[Int]).must(be(Seq(0, 1)))

      "answer 404 for an unknown section" in:
        val (ce, session) = examWithSections(1)
        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}/sections/999", session)))
          .must(be(Status.NOT_FOUND))

    "updating a section" should:
      "keep at least one lottery item" in:
        val (ce, session) = examWithSections(1)
        val body = Json.obj("lotteryOn" -> true, "lotteryItemCount" -> 0, "expanded" -> false)

        val result =
          runIO(put(s"/app/iop/exams/${ce.id}/sections/${id(sections(ce).head)}", body, session))
        statusOf(result).must(be(Status.OK))
        val section = sections(ce).head
        ((section \ "lotteryOn").as[Boolean], (section \ "lotteryItemCount").as[Int])
          .must(be((true, 1)))
        (section \ "expanded").as[Boolean].must(be(false))

    "reordering sections" should:
      "move a section and renumber the rest" in:
        val (ce, session) = examWithSections(3)
        statusOf(reorder(s"/app/iop/exams/${ce.id}/reorder", 2, 0, session)).must(be(Status.OK))
        sectionNames(ce).must(be(Seq("S2", "S0", "S1")))

      "reject a position outside the exam" in:
        val (ce, session) = examWithSections(2)
        statusOf(reorder(s"/app/iop/exams/${ce.id}/reorder", -1, 0, session))
          .must(be(Status.BAD_REQUEST))
        statusOf(reorder(s"/app/iop/exams/${ce.id}/reorder", 0, 5, session))
          .must(be(Status.BAD_REQUEST))
        sectionNames(ce).must(be(Seq("S0", "S1")))

      "answer 400 without positions" in:
        val (ce, session) = examWithSections(2)
        statusOf(send("PUT", s"/app/iop/exams/${ce.id}/reorder", Json.obj(), session))
          .must(be(Status.BAD_REQUEST))

    "adding a question" should:
      "insert it at the given position" in:
        val (ce, session) = examWithSections(1)
        statusOf(addQuestion(ce, session, essay("First"))).must(be(Status.OK))
        statusOf(addQuestion(ce, session, essay("Third"), 1)).must(be(Status.OK))
        val result = addQuestion(ce, session, essay("Second"), 1)
        statusOf(result).must(be(Status.OK))

        (contentAsJsonOf(result) \ "question" \ "question").as[String].must(be("Second"))
        questionTexts(ce).must(be(Seq("First", "Second", "Third")))
        questions(ce).map(q => (q \ "maxScore").as[Double]).toSet.must(be(Set(5.0)))

      "reject an invalid question" in:
        val (ce, session) = examWithSections(1)
        val result        = addQuestion(ce, session, essay("No score") - "defaultMaxScore")
        statusOf(result).must(be(Status.BAD_REQUEST))
        contentAsStringOf(result).must(be("no max score defined"))
        questions(ce).must(be(empty))

    "updating a question" should:
      "change the question in the exam" in:
        val (ce, session) = examWithSections(1)
        addQuestion(ce, session, essay("Original"))
        val esq      = questions(ce).head
        val question = (esq \ "question").as[JsObject] ++ Json.obj("question" -> "Edited")

        val result = send(
          "PUT",
          s"/app/iop/exams/${ce.id}/sections/${id(sections(ce).head)}/questions/${id(esq)}",
          Json.obj("question" -> question),
          session
        )
        statusOf(result).must(be(Status.OK))
        questionTexts(ce).must(be(Seq("Edited")))

      "answer 404 for an unknown question" in:
        val (ce, session) = examWithSections(1)
        val result = send(
          "PUT",
          s"/app/iop/exams/${ce.id}/sections/${id(sections(ce).head)}/questions/999",
          Json.obj("question" -> essay("x")),
          session
        )
        statusOf(result).must(be(Status.NOT_FOUND))

    "reordering questions" should:
      "move a question and renumber the rest" in:
        val (ce, session) = examWithSections(1)
        Seq("A", "B", "C").zipWithIndex.foreach((q, i) => addQuestion(ce, session, essay(q), i))
        val path = s"/app/iop/exams/${ce.id}/sections/${id(sections(ce).head)}/reorder"

        statusOf(reorder(path, 0, 2, session)).must(be(Status.OK))
        questionTexts(ce).must(be(Seq("B", "C", "A")))

    "removing a question" should:
      "renumber the rest and shrink the lottery to fit" in:
        val (ce, session) = examWithSections(1)
        Seq("A", "B", "C").zipWithIndex.foreach((q, i) => addQuestion(ce, session, essay(q), i))
        val sectionId = id(sections(ce).head)
        runIO(put(
          s"/app/iop/exams/${ce.id}/sections/$sectionId",
          Json.obj("lotteryOn" -> true, "lotteryItemCount" -> 3),
          session
        ))
        val questionId = (questions(ce).head \ "question" \ "id").as[Long]

        val result =
          runIO(delete(
            s"/app/iop/exams/${ce.id}/sections/$sectionId/questions/$questionId",
            session
          ))
        statusOf(result).must(be(Status.OK))
        questionTexts(ce).must(be(Seq("B", "C")))
        questions(ce).map(q => (q \ "sequenceNumber").as[Int]).must(be(Seq(0, 1)))
        (sections(ce).head \ "lotteryItemCount").as[Int].must(be(2))

    "clearing a section" should:
      "remove all of its questions" in:
        val (ce, session) = examWithSections(1)
        Seq("A", "B").zipWithIndex.foreach((q, i) => addQuestion(ce, session, essay(q), i))
        val sectionId = id(sections(ce).head)

        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}/sections/$sectionId/questions", session)))
          .must(be(Status.OK))
        questions(ce).must(be(empty))

    "editing an exam the user cannot see" should:
      "be forbidden" in:
        val (ce, _) = examWithSections(1)
        // A draft is not visible to its owners yet
        store.update(ce.externalRef)(_ ++ Json.obj(
          "examOwners" -> Json.arr(Json.obj("id" -> 9001, "email" -> "teacher@funet.fi"))
        ))
        val (_, session) = runIO(loginAsTeacher())
        val sectionId    = id(sections(ce).head)

        statusOf(runIO(post(s"/app/iop/exams/${ce.id}/sections", session)))
          .must(be(Status.FORBIDDEN))
        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}/sections/$sectionId", session)))
          .must(be(Status.FORBIDDEN))
        sections(ce).size.must(be(1))

      "answer 404 for an unknown exam" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/iop/exams/999/sections/1", session))).must(be(Status.NOT_FOUND))
