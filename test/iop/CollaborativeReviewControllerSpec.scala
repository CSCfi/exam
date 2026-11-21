// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import models.exam.{Exam, ExamExecutionType}
import models.iop.CollaborativeExam
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.{Result, Session}
import services.json.EbeanMapper

/** Reviewing attempts at a collaborative exam, which XM keeps as assessment documents. */
class CollaborativeReviewControllerSpec extends BaseIntegrationSpec with BeforeAndAfterAll:

  private val Port                   = 31253
  private val ExamRef                = "collab-exam"
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

  private def collaborativeExam(): CollaborativeExam =
    ensureTestDataLoaded()
    val ce = new CollaborativeExam
    ce.externalRef = ExamRef
    ce.save()
    ce

  /** The test exam as an attempt waiting for review, owned by the teacher */
  private def attemptExam(changes: JsObject = Json.obj()): JsObject =
    val exam = DB.find(classOf[Exam], 1L)
    exam.executionType = DB.find(classOf[ExamExecutionType], 1L)
    val json = Json.parse(EbeanMapper.create().writeValueAsString(exam)).as[JsObject] - "examRecord"
    json ++ Json.obj(
      "state"      -> "REVIEW",
      "examOwners" -> Json.arr(Json.obj("id" -> 9001, "email" -> "teacher@funet.fi"))
    ) ++ changes

  private def addAttempt(
      ref: String,
      eppn: String = "student@funet.fi",
      exam: JsObject = attemptExam()
  ) =
    store.putAssessment(ExamRef, ref, Json.obj("user" -> Json.obj("eppn" -> eppn), "exam" -> exam))

  /** Ready to be recorded: graded, with everything a record needs */
  private def gradedExam(changes: JsObject = Json.obj()): JsObject = attemptExam(Json.obj(
    "state"          -> "GRADED",
    "gradingType"    -> "GRADED",
    "answerLanguage" -> "fi",
    "creditType"     -> Json.obj("id" -> 1, "type" -> "FINAL"),
    "grade"          -> Json.obj("id" -> 1, "name" -> "1", "marksRejection" -> false),
    "gradedByUser"   -> Json.obj("id" -> 1, "email" -> "admin@funet.fi")
  ) ++ changes)

  private def stored(ref: String): JsObject =
    (store.assessment(ExamRef, ref).get \ "exam").as[JsObject]

  private def firstQuestionId(ref: String): Long =
    (stored(ref) \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "id").as[Long]

  private def send(method: String, path: String, body: JsValue, session: Session): Result =
    runIO(makeRequest(method, path, Some(body), session = session))

  private def listing(ce: CollaborativeExam, session: Session): Seq[JsObject] =
    val result = runIO(get(s"/app/iop/reviews/${ce.id}", session = session))
    statusOf(result).must(be(Status.OK))
    contentAsJsonOf(result).as[Seq[JsObject]]

  "CollaborativeReviewController" when:
    "listing assessments" should:
      "leave out deleted ones and add the scores" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        addAttempt("a2", exam = attemptExam(Json.obj("state" -> "DELETED")))
        val (_, session) = runIO(loginAsAdmin())

        val found = listing(ce, session)
        found.map(a => (a \ "_id").as[String]).must(be(Seq("a1")))
        (found.head \ "exam" \ "maxScore").asOpt[Double].must(not(be(None)))
        (found.head \ "user" \ "eppn").as[String].must(be("student@funet.fi"))

      "hide the students from teachers" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        listing(ce, session).head.keys.must(not(contain("user")))

      "answer 500 when XM fails and 404 for an unknown exam" in:
        val ce           = collaborativeExam()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get("/app/iop/reviews/999", session = session))).must(be(Status.NOT_FOUND))
        store.failWith = Some(Status.BAD_GATEWAY)
        statusOf(runIO(get(s"/app/iop/reviews/${ce.id}", session = session)))
          .must(be(Status.INTERNAL_SERVER_ERROR))

    "getting an assessment" should:
      "return it" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(get(s"/app/iop/reviews/${ce.id}/a1", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "exam" \ "state").as[String].must(be("REVIEW"))

      "answer 500 for one missing from XM" in:
        val ce           = collaborativeExam()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get(s"/app/iop/reviews/${ce.id}/missing", session = session)))
          .must(be(Status.INTERNAL_SERVER_ERROR))

    "listing a student's other attempts" should:
      "return their attempts except the current one" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        addAttempt("a2")
        addAttempt("a3", eppn = "other@funet.fi")
        val (_, session) = runIO(loginAsAdmin())

        val result = runIO(get(s"/app/iop/reviews/${ce.id}/participations/a1", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(a => (a \ "_id").as[String])
          .must(be(Seq("a2")))

      "answer 404 for an unknown attempt or one without a student" in:
        val ce = collaborativeExam()
        store.putAssessment(ExamRef, "nobody", Json.obj("exam" -> attemptExam()))
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get(s"/app/iop/reviews/${ce.id}/participations/missing", session = session)))
          .must(be(Status.NOT_FOUND))
        statusOf(runIO(get(s"/app/iop/reviews/${ce.id}/participations/nobody", session = session)))
          .must(be(Status.NOT_FOUND))

    "scoring an answer" should:
      "save the score to XM" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        val qid          = firstQuestionId("a1")

        val result =
          runIO(put(
            s"/app/iop/reviews/${ce.id}/a1/question/$qid",
            Json.obj("evaluatedScore" -> 1.5),
            session
          ))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "rev").as[String].must(be("2-rev"))
        (stored(
          "a1"
        ) \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "essayAnswer" \ "evaluatedScore")
          .as[Double].must(be(1.5))

    "grading an assessment" should:
      "save the grading and who graded it" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (teacher, session) = runIO(loginAsTeacher())
        val body = Json.obj(
          "state"          -> "GRADED",
          "grade"          -> Json.obj("id" -> 1, "name" -> "1"),
          "answerLanguage" -> "sv",
          "additionalInfo" -> "Good work"
        )

        statusOf(runIO(put(s"/app/iop/reviews/${ce.id}/a1", body, session))).must(be(Status.OK))
        val exam = stored("a1")
        (exam \ "state").as[String].must(be("GRADED"))
        (exam \ "gradingType").as[String].must(be("GRADED"))
        (exam \ "answerLanguage").as[String].must(be("sv"))
        (exam \ "additionalInfo").as[String].must(be("Good work"))
        (exam \ "gradedByUser" \ "email").as[String].must(be(teacher.email))

      "clear the grade when it is not graded" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam())
        val (_, session) = runIO(loginAsTeacher())

        val body = Json.obj("gradingType" -> "NOT_GRADED")
        statusOf(runIO(put(s"/app/iop/reviews/${ce.id}/a1", body, session))).must(be(Status.OK))
        (stored("a1") \ "grade").get.must(be(JsNull))
        (stored("a1") \ "gradingType").as[String].must(be("NOT_GRADED"))

      "not be allowed for others than its owners" in:
        val ce = collaborativeExam()
        addAttempt(
          "a1",
          exam = attemptExam(Json.obj("examOwners" -> Json.arr(Json.obj(
            "id"    -> 1,
            "email" -> "x@y.fi"
          ))))
        )
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1",
          Json.obj("state" -> "GRADED"),
          session
        )))
          .must(be(Status.FORBIDDEN))
        (stored("a1") \ "state").as[String].must(be("REVIEW"))

      "not be allowed once recorded" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam(Json.obj("state" -> "GRADED_LOGGED")))
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1",
          Json.obj("state" -> "GRADED"),
          session
        )))
          .must(be(Status.FORBIDDEN))

    "commenting an assessment" should:
      "save the feedback" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/comment",
          Json.obj("comment" -> "Nice"),
          session
        )))
          .must(be(Status.OK))
        (stored("a1") \ "examFeedback" \ "comment").as[String].must(be("Nice"))

      "answer 400 without a comment" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(s"/app/iop/reviews/${ce.id}/a1/comment", Json.obj(), session)))
          .must(be(Status.BAD_REQUEST))

    "reading the feedback" should:
      "mark it read" in:
        collaborativeExam()
        addAttempt(
          "a1",
          exam = gradedExam(Json.obj("examFeedback" -> Json.obj("comment" -> "Nice")))
        )
        val (_, session) = runIO(loginAsStudent())
        statusOf(send("POST", s"/app/iop/reviews/$ExamRef/a1/comment", Json.obj(), session))
          .must(be(Status.OK))
        (stored("a1") \ "examFeedback" \ "feedbackStatus").as[Boolean].must(be(true))
        (stored("a1") \ "examFeedback" \ "comment").as[String].must(be("Nice"))

    "adding information to a recorded assessment" should:
      "save it" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam(Json.obj("state" -> "GRADED_LOGGED")))
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/info",
          Json.obj("assessmentInfo" -> "Retake"),
          session
        )))
          .must(be(Status.OK))
        (stored("a1") \ "assessmentInfo").as[String].must(be("Retake"))

      "answer 400 without information" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam(Json.obj("state" -> "GRADED_LOGGED")))
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(s"/app/iop/reviews/${ce.id}/a1/info", Json.obj(), session)))
          .must(be(Status.BAD_REQUEST))

      "not be allowed before it is recorded" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam())
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/info",
          Json.obj("assessmentInfo" -> "x"),
          session
        )))
          .must(be(Status.FORBIDDEN))

    "recording an assessment" should:
      "lock it as recorded by the user" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam())
        val (teacher, session) = runIO(loginAsTeacher())
        statusOf(runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/record",
          Json.obj("gradingType" -> "GRADED"),
          session
        )))
          .must(be(Status.OK))
        (stored("a1") \ "state").as[String].must(be("GRADED_LOGGED"))
        (stored("a1") \ "gradedByUser" \ "email").as[String].must(be(teacher.email))

      "require a valid grading type" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam())
        val (_, session) = runIO(loginAsTeacher())
        def record(body: JsObject) =
          statusOf(runIO(put(s"/app/iop/reviews/${ce.id}/a1/record", body, session)))
        record(Json.obj()).must(be(Status.BAD_REQUEST))
        record(Json.obj("gradingType" -> "SOMETHING")).must(be(Status.BAD_REQUEST))
        (stored("a1") \ "state").as[String].must(be("GRADED"))

      "refuse an assessment nobody has graded" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam() - "gradedByUser")
        val (_, session) = runIO(loginAsTeacher())
        val result = runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/record",
          Json.obj("gradingType" -> "GRADED"),
          session
        ))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).must(be("not yet graded by anyone!"))

      "refuse one already recorded" in:
        val ce = collaborativeExam()
        addAttempt("a1", exam = gradedExam(Json.obj("state" -> "GRADED_LOGGED")))
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(put(
          s"/app/iop/reviews/${ce.id}/a1/record",
          Json.obj("gradingType" -> "GRADED"),
          session
        ))
        statusOf(result).must(be(Status.FORBIDDEN))

    "messaging the other reviewers" should:
      "be accepted from an owner" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        statusOf(send(
          "POST",
          s"/app/iop/reviews/${ce.id}/a1/mail",
          Json.obj("msg" -> "Have a look"),
          session
        ))
          .must(be(Status.OK))

      "answer 400 without a message" in:
        val ce = collaborativeExam()
        addAttempt("a1")
        val (_, session) = runIO(loginAsTeacher())
        statusOf(send("POST", s"/app/iop/reviews/${ce.id}/a1/mail", Json.obj(), session))
          .must(be(Status.BAD_REQUEST))

      "not be allowed for others than its owners" in:
        val ce = collaborativeExam()
        addAttempt(
          "a1",
          exam = attemptExam(Json.obj("examOwners" -> Json.arr(Json.obj(
            "id"    -> 1,
            "email" -> "x@y.fi"
          ))))
        )
        val (_, session) = runIO(loginAsTeacher())
        statusOf(send(
          "POST",
          s"/app/iop/reviews/${ce.id}/a1/mail",
          Json.obj("msg" -> "Hi"),
          session
        ))
          .must(be(Status.FORBIDDEN))

    "exporting assessments" should:
      "write the chosen recorded ones as CSV" in:
        val ce       = collaborativeExam()
        val recorded = gradedExam(Json.obj("state" -> "GRADED_LOGGED", "customCredit" -> 5))
        addAttempt("a1", exam = recorded)
        addAttempt("a2", exam = recorded)
        addAttempt("a3", exam = gradedExam())
        val (_, session) = runIO(loginAsAdmin())

        val result = send(
          "POST",
          s"/app/iop/reviews/${ce.id}",
          Json.obj("params" -> Json.obj("ids" -> "a1,a3")),
          session
        )
        statusOf(result).must(be(Status.OK))
        headerOf(result, "Content-Disposition").must(
          be(Some("attachment; filename=\"assessments.csv\""))
        )
        // A header row and the one recorded assessment chosen
        contentAsStringOf(result).linesIterator.count(_.trim.nonEmpty).must(be(2))
