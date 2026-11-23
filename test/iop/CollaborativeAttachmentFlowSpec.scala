// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import cats.effect.IO
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.iop.CollaborativeExam
import models.user.User
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.Files.SingletonTemporaryFileCreator
import play.api.libs.json.*
import play.api.mvc.{MultipartFormData, Result, Session}
import play.api.test.FakeRequest
import play.api.test.Helpers.*

import java.nio.charset.StandardCharsets
import java.nio.file.Files
import java.util.Base64
import scala.concurrent.Future

/** Attachments of collaborative exams, which XM stores. */
class CollaborativeAttachmentFlowSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with EbeanQueryExtensions:

  private val Port                   = 31255
  private val store                  = new FakeXmExamStore
  private val attachments            = new FakeXmAttachments
  private var server: Option[Server] = None

  override protected def appBuilder: GuiceApplicationBuilder =
    super.appBuilder.configure("exam.integration.iop.host" -> s"http://localhost:$Port")

  override def beforeAll(): Unit =
    super.beforeAll()
    server = Some(RemoteServerHelper.createServer(
      Port,
      true,
      ServletDef.FromInstance(store)       -> List("/api/exams/*"),
      ServletDef.FromInstance(attachments) -> List("/api/attachments/*")
    ))

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    store.reset()
    attachments.reset()

  private def createExam(): CollaborativeExam =
    val (_, session) = runIO(loginAsAdmin())
    val result       = runIO(post("/app/iop/exams", session))
    statusOf(result).must(be(Status.CREATED))
    DB.find(classOf[CollaborativeExam], (contentAsJsonOf(result) \ "id").as[Long])

  private def doc(ce: CollaborativeExam): JsObject = store.get(ce.externalRef).get

  private def upload(
      url: String,
      session: Session,
      dataParts: Map[String, String] = Map.empty,
      content: String = "first version",
      withFile: Boolean = true
  ): Result =
    val tmp = Files.createTempFile("collab_attachment", ".txt")
    Files.writeString(tmp, content, StandardCharsets.UTF_8)
    val form = MultipartFormData(
      dataParts = dataParts.map((k, v) => k -> Seq(v)),
      files = Seq(MultipartFormData.FilePart(
        "file",
        "notes.txt",
        Some("text/plain"),
        SingletonTemporaryFileCreator.create(tmp)
      )).filter(_ => withFile),
      badParts = Seq.empty
    )
    val request = FakeRequest(POST, url)
      .withHeaders("Csrf-Token" -> "nocheck")
      .withSession(session.data.toSeq*)
      .withMultipartFormDataBody(form)
    try runIO(IO.fromFuture(IO(route(app, request).get)))
    finally Files.deleteIfExists(tmp)

  private def body(result: Result): String =
    new String(contentAsBytes(Future.successful(result)).toArray, StandardCharsets.UTF_8)

  private def stored(id: String): String = new String(attachments.get(id).get.content)

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get

  private def enrol(ce: CollaborativeExam): Unit =
    val enrolment = new ExamEnrolment
    enrolment.user = user("student@funet.fi")
    enrolment.collaborativeExam = ce
    enrolment.save()

  private def ref(id: String): JsObject =
    Json.obj("externalId" -> id, "fileName" -> "notes.txt", "mimeType" -> "text/plain")

  private val QuestionId = 10L

  /** One section with one question, which may refer to a file in XM */
  private def withQuestion(ce: CollaborativeExam, attachment: Option[String] = None): Unit =
    val question = Json.obj("id" -> 20, "question" -> "<p>Why?</p>") ++
      attachment.fold(Json.obj())(id => Json.obj("attachment" -> ref(id)))
    store.update(ce.externalRef)(_ ++ Json.obj("examSections" -> Json.arr(Json.obj(
      "id"               -> 1,
      "name"             -> "Section",
      "sectionQuestions" -> Json.arr(Json.obj("id" -> QuestionId, "question" -> question))
    ))))

  private def questionAttachment(ce: CollaborativeExam): JsLookupResult =
    doc(ce) \ "examSections" \ 0 \ "sectionQuestions" \ 0 \ "question" \ "attachment"

  private def present(lookup: JsLookupResult): Boolean = lookup.toOption.exists(_ != JsNull)

  private def withFeedback(ce: CollaborativeExam, attachment: Option[String]): Unit =
    val feedback = Json.obj("comment" -> "Good") ++
      attachment.fold(Json.obj())(id => Json.obj("attachment" -> ref(id)))
    store.putAssessment(
      ce.externalRef,
      "a1",
      Json.obj("exam" -> Json.obj("examFeedback" -> feedback))
    )

  private def feedbackOf(ce: CollaborativeExam): JsObject =
    (store.assessment(ce.externalRef, "a1").get \ "exam" \ "examFeedback").as[JsObject]

  "CollaborativeAttachmentController" when:
    "attaching a file to an exam" should:
      "store it in XM and refer to it from the exam" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())

        val result =
          upload("/app/iop/collab/attachment/exam", session, Map("examId" -> ce.id.toString))
        statusOf(result).must(be(Status.CREATED))
        val id = (doc(ce) \ "attachment" \ "externalId").as[String]
        (contentAsJsonOf(result) \ "externalId").as[String].must(be(id))
        stored(id).must(be("first version"))

      "replace the earlier file" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        val data         = Map("examId" -> ce.id.toString)
        upload("/app/iop/collab/attachment/exam", session, data)
        upload("/app/iop/collab/attachment/exam", session, data, "second version")

        attachments.ids.size.must(be(1))
        stored((doc(ce) \ "attachment" \ "externalId").as[String]).must(be("second version"))

      "answer 400 without an exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload("/app/iop/collab/attachment/exam", session)).must(be(Status.BAD_REQUEST))

    "downloading an exam attachment" should:
      "stream the file" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        upload("/app/iop/collab/attachment/exam", session, Map("examId" -> ce.id.toString))

        val result = runIO(get(s"/app/iop/collab/attachment/exam/${ce.id}", session = session))
        statusOf(result).must(be(Status.OK))
        headerOf(result, "Content-Disposition").must(
          be(Some("attachment; filename*=UTF-8''notes.txt"))
        )
        body(result).must(be("first version"))

    "removing an exam attachment" should:
      "delete the file and the reference" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        upload("/app/iop/collab/attachment/exam", session, Map("examId" -> ce.id.toString))

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}", session))).must(be(
          Status.OK
        ))
        attachments.ids.must(be(empty))
        (doc(ce) \ "attachment").toOption.filterNot(_ == JsNull).must(be(None))

      "answer 404 when there is none" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}", session)))
          .must(be(Status.NOT_FOUND))

    "downloading a file by its XM id" should:
      "send it base64 encoded" in:
        attachments.add("att-x", "notes.txt", "some content")
        val (_, session) = runIO(loginAsStudent())

        val result = runIO(get("/app/iop/collab/attachment/att-x", session = session))
        statusOf(result).must(be(Status.OK))
        new String(Base64.getDecoder.decode(body(result))).must(be("some content"))

      "pass on XM's 404" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(get("/app/iop/collab/attachment/missing", session = session)))
          .must(be(Status.NOT_FOUND))

    "attaching a file to an assessment's feedback" should:
      "store it and refer to it from the feedback" in:
        val ce = createExam()
        store.putAssessment(
          ce.externalRef,
          "a1",
          Json.obj("exam" -> Json.obj("examFeedback" -> Json.obj("comment" -> "Good")))
        )
        val (_, session) = runIO(loginAsTeacher())

        val result = upload(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session)
        statusOf(result).must(be(Status.OK))
        val feedback =
          (store.assessment(ce.externalRef, "a1").get \ "exam" \ "examFeedback").as[JsObject]
        val id = (feedback \ "attachment" \ "externalId").as[String]
        (contentAsJsonOf(result) \ "externalId").as[String].must(be(id))
        (contentAsJsonOf(result) \ "rev").as[String].must(be("2-rev"))
        (feedback \ "comment").as[String].must(be("Good"))
        stored(id).must(be("first version"))

      "require a teacher" in:
        val ce = createExam()
        store.putAssessment(
          ce.externalRef,
          "a1",
          Json.obj("exam" -> Json.obj("examFeedback" -> Json.obj()))
        )
        val (_, studentSession) = runIO(loginAsStudent())

        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", studentSession))
          .must(be(Status.FORBIDDEN))
        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", Session()))
          .must(be(Status.UNAUTHORIZED))
        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", Session())))
          .must(be(Status.UNAUTHORIZED))
        attachments.ids.must(be(empty))

      "answer 404 for an unknown assessment" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/missing/feedback", session))
          .must(be(Status.NOT_FOUND))

    "removing an assessment's feedback attachment" should:
      "delete the file and the reference" in:
        val ce = createExam()
        store.putAssessment(
          ce.externalRef,
          "a1",
          Json.obj("exam" -> Json.obj("examFeedback" -> Json.obj("comment" -> "Good")))
        )
        val (_, session) = runIO(loginAsTeacher())
        upload(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session)

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session)))
          .must(be(Status.OK))
        attachments.ids.must(be(empty))
        val feedback =
          (store.assessment(ce.externalRef, "a1").get \ "exam" \ "examFeedback").as[JsObject]
        feedback.keys.must(be(Set("comment")))

    "attaching a file to an exam fails" should:
      "pass on XM's refusal of the file and leave the exam as it was" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        attachments.failWith = Some("POST" -> Status.INSUFFICIENT_STORAGE)

        statusOf(upload(
          "/app/iop/collab/attachment/exam",
          session,
          Map("examId" -> ce.id.toString)
        ))
          .must(be(Status.INSUFFICIENT_STORAGE))
        present(doc(ce) \ "attachment").must(be(false))

      "answer 500 when the exam can not be saved" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        store.failPutsWith = Some(Status.CONFLICT)

        statusOf(upload(
          "/app/iop/collab/attachment/exam",
          session,
          Map("examId" -> ce.id.toString)
        ))
          .must(be(Status.INTERNAL_SERVER_ERROR))

      "answer 400 without a file and 404 for an unknown exam" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        val url          = "/app/iop/collab/attachment/exam"
        statusOf(upload(url, session, Map("examId" -> ce.id.toString), withFile = false))
          .must(be(Status.BAD_REQUEST))
        statusOf(upload(url, session, Map("examId" -> "999999"))).must(be(Status.NOT_FOUND))
        attachments.ids.must(be(empty))

    "downloading an exam attachment fails" should:
      "answer 404 for an unknown exam, an exam without a file, or a file XM does not have" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        def status(id: Long) =
          statusOf(runIO(get(s"/app/iop/collab/attachment/exam/$id", session = session)))

        status(999999).must(be(Status.NOT_FOUND))
        status(ce.id).must(be(Status.NOT_FOUND))
        store.update(ce.externalRef)(_ ++ Json.obj("attachment" -> ref("gone")))
        status(ce.id).must(be(Status.NOT_FOUND))
        store.update(ce.externalRef)(_ ++ Json.obj("attachment" -> Json.obj("fileName" -> "x")))
        status(ce.id).must(be(Status.NOT_FOUND))

      "not be allowed for students" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(get(s"/app/iop/collab/attachment/exam/${ce.id}", session = session)))
          .must(be(Status.FORBIDDEN))

    "removing an exam attachment XM has trouble with" should:
      "clear the reference when XM no longer has the file" in:
        val ce = createExam()
        store.update(ce.externalRef)(_ ++ Json.obj("attachment" -> ref("gone")))
        val (_, session) = runIO(loginAsTeacher())

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}", session)))
          .must(be(Status.OK))
        present(doc(ce) \ "attachment").must(be(false))

      "keep the reference when XM can not delete the file" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        upload("/app/iop/collab/attachment/exam", session, Map("examId" -> ce.id.toString))
        attachments.failWith = Some("DELETE" -> Status.SERVICE_UNAVAILABLE)

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}", session)))
          .must(be(Status.SERVICE_UNAVAILABLE))
        present(doc(ce) \ "attachment").must(be(true))
        attachments.ids.size.must(be(1))

      "answer 404 for an unknown exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(delete("/app/iop/collab/attachment/exam/999999", session)))
          .must(be(Status.NOT_FOUND))

    "attaching a file to a question" should:
      "store it in XM and refer to it from the question, replacing the earlier file" in:
        val ce = createExam()
        withQuestion(ce)
        val (_, session) = runIO(loginAsTeacher())
        val data         = Map("examId" -> ce.id.toString, "questionId" -> QuestionId.toString)

        statusOf(upload("/app/iop/collab/attachment/question", session, data))
          .must(be(Status.CREATED))
        upload("/app/iop/collab/attachment/question", session, data, "second version")

        attachments.ids.size.must(be(1))
        stored((questionAttachment(ce) \ "externalId").as[String]).must(be("second version"))

      "answer 400 for missing ids or file and 404 for an unknown question" in:
        val ce = createExam()
        withQuestion(ce)
        val (_, session) = runIO(loginAsTeacher())
        val url          = "/app/iop/collab/attachment/question"
        val data         = Map("examId" -> ce.id.toString, "questionId" -> QuestionId.toString)

        statusOf(upload(url, session, Map("examId" -> ce.id.toString))).must(be(Status.BAD_REQUEST))
        statusOf(upload(url, session, data + ("questionId" -> "x"))).must(be(Status.BAD_REQUEST))
        statusOf(upload(url, session, data, withFile = false)).must(be(Status.BAD_REQUEST))
        statusOf(upload(url, session, data + ("questionId" -> "999"))).must(be(Status.NOT_FOUND))
        statusOf(upload(url, session, data + ("examId" -> "999999"))).must(be(Status.NOT_FOUND))
        attachments.ids.must(be(empty))

      "not be allowed for students" in:
        val ce = createExam()
        withQuestion(ce)
        val (_, session) = runIO(loginAsStudent())
        val data         = Map("examId" -> ce.id.toString, "questionId" -> QuestionId.toString)
        statusOf(upload("/app/iop/collab/attachment/question", session, data))
          .must(be(Status.FORBIDDEN))

    "removing a question attachment" should:
      "delete the file and the reference" in:
        val ce = createExam()
        attachments.add("att-q", "notes.txt", "question file")
        withQuestion(ce, Some("att-q"))
        val (_, session) = runIO(loginAsTeacher())

        statusOf(runIO(delete(
          s"/app/iop/collab/attachment/exam/${ce.id}/question/$QuestionId",
          session
        )))
          .must(be(Status.OK))
        attachments.ids.must(be(empty))
        present(questionAttachment(ce)).must(be(false))

      "answer 404 when there is nothing to remove" in:
        val ce = createExam()
        withQuestion(ce)
        val (_, session) = runIO(loginAsTeacher())
        def status(eid: Long, qid: Long) =
          statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/$eid/question/$qid", session)))

        status(ce.id, QuestionId).must(be(Status.NOT_FOUND))
        status(ce.id, 999).must(be(Status.NOT_FOUND))
        status(999999, QuestionId).must(be(Status.NOT_FOUND))

    "downloading a question attachment" should:
      "stream the file to teachers and to students enrolled on the exam" in:
        val ce = createExam()
        attachments.add("att-q", "notes.txt", "question file")
        withQuestion(ce, Some("att-q"))
        val url = s"/app/iop/collab/attachment/exam/${ce.id}/question/$QuestionId"

        val (_, teacher) = runIO(loginAsTeacher())
        body(runIO(get(url, session = teacher))).must(be("question file"))

        val (_, student) = runIO(loginAsStudent())
        statusOf(runIO(get(url, session = student))).must(be(Status.FORBIDDEN))
        enrol(ce)
        val result = runIO(get(url, session = student))
        statusOf(result).must(be(Status.OK))
        body(result).must(be("question file"))

      "answer 404 when there is no file" in:
        val ce = createExam()
        withQuestion(ce)
        val (_, session) = runIO(loginAsTeacher())
        def status(eid: Long, qid: Long) =
          statusOf(runIO(get(
            s"/app/iop/collab/attachment/exam/$eid/question/$qid",
            session = session
          )))

        status(ce.id, QuestionId).must(be(Status.NOT_FOUND))
        status(ce.id, 999).must(be(Status.NOT_FOUND))
        status(999999, QuestionId).must(be(Status.NOT_FOUND))

    "attaching a feedback file XM has trouble with" should:
      "replace the earlier file" in:
        val ce = createExam()
        withFeedback(ce, None)
        val (_, session) = runIO(loginAsTeacher())
        val url          = s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback"
        upload(url, session)
        statusOf(upload(url, session, content = "second version")).must(be(Status.OK))

        attachments.ids.size.must(be(1))
        stored((feedbackOf(ce) \ "attachment" \ "externalId").as[String]).must(be("second version"))

      "answer 500 and keep no file when the assessment has no feedback" in:
        val ce = createExam()
        store.putAssessment(ce.externalRef, "a1", Json.obj("exam" -> Json.obj()))
        val (_, session) = runIO(loginAsTeacher())

        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session))
          .must(be(Status.INTERNAL_SERVER_ERROR))
        attachments.ids.must(be(empty))

      "answer 500 when XM refuses the file or the assessment" in:
        val ce = createExam()
        withFeedback(ce, None)
        val (_, session) = runIO(loginAsTeacher())
        val url          = s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback"

        attachments.failWith = Some("POST" -> Status.INSUFFICIENT_STORAGE)
        statusOf(upload(url, session)).must(be(Status.INTERNAL_SERVER_ERROR))
        attachments.failWith = None
        store.failPutsWith = Some(Status.CONFLICT)
        statusOf(upload(url, session)).must(be(Status.INTERNAL_SERVER_ERROR))

      "answer 400 without a file and 404 for an unknown exam" in:
        val ce = createExam()
        withFeedback(ce, None)
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(
          s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback",
          session,
          withFile = false
        ))
          .must(be(Status.BAD_REQUEST))
        statusOf(upload("/app/iop/collab/attachment/exam/999999/a1/feedback", session))
          .must(be(Status.NOT_FOUND))

    "removing a feedback file XM has trouble with" should:
      "clear the reference when XM no longer has the file" in:
        val ce = createExam()
        withFeedback(ce, Some("gone"))
        val (_, session) = runIO(loginAsTeacher())

        val result = runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "rev").as[String].must(be("2-rev"))
        feedbackOf(ce).keys.must(be(Set("comment")))

      "keep the reference when XM can not delete the file" in:
        val ce = createExam()
        attachments.add("att-f", "notes.txt", "feedback")
        withFeedback(ce, Some("att-f"))
        attachments.failWith = Some("DELETE" -> Status.SERVICE_UNAVAILABLE)
        val (_, session) = runIO(loginAsTeacher())

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session)))
          .must(be(Status.INTERNAL_SERVER_ERROR))
        present(feedbackOf(ce) \ "attachment").must(be(true))

      "answer 500 when the assessment can not be saved or has no feedback" in:
        val ce = createExam()
        attachments.add("att-f", "notes.txt", "feedback")
        withFeedback(ce, Some("att-f"))
        val (_, session) = runIO(loginAsTeacher())
        val url          = s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback"

        store.failPutsWith = Some(Status.CONFLICT)
        statusOf(runIO(delete(url, session))).must(be(Status.INTERNAL_SERVER_ERROR))
        store.failPutsWith = None
        store.putAssessment(ce.externalRef, "a1", Json.obj("exam" -> Json.obj()))
        statusOf(runIO(delete(url, session))).must(be(Status.INTERNAL_SERVER_ERROR))

      "answer 404 for an unknown exam or assessment" in:
        val ce           = createExam()
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/a1/feedback", session)))
          .must(be(Status.NOT_FOUND))
        statusOf(runIO(delete("/app/iop/collab/attachment/exam/999999/a1/feedback", session)))
          .must(be(Status.NOT_FOUND))
