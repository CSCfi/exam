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
import models.user.{Permission, PermissionType, User}
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
      content: String = "first version"
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
      )),
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

    "attaching a language inspection statement" should:
      "be allowed for language inspectors" in:
        val ce = createExam()
        store.update(ce.externalRef)(_ ++ Json.obj("languageInspection" -> Json.obj("id" -> 1)))
        // Permissions are read at login
        val permission = new Permission
        permission.`type` = PermissionType.CAN_INSPECT_LANGUAGE
        permission.save()
        val teacher = user("teacher@funet.fi")
        teacher.permissions.add(permission)
        teacher.update()
        val (_, session) = runIO(loginAsTeacher())

        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/statement", session))
          .must(be(Status.CREATED))
        val id =
          (doc(ce) \ "languageInspection" \ "statement" \ "attachment" \ "externalId").as[String]
        stored(id).must(be("first version"))

        statusOf(runIO(delete(s"/app/iop/collab/attachment/exam/${ce.id}/statement", session)))
          .must(be(Status.OK))
        attachments.ids.must(be(empty))

      "not be allowed for other teachers" in:
        val ce = createExam()
        store.update(ce.externalRef)(_ ++ Json.obj("languageInspection" -> Json.obj("id" -> 1)))
        val (_, session) = runIO(loginAsTeacher())
        statusOf(upload(s"/app/iop/collab/attachment/exam/${ce.id}/statement", session))
          .must(be(Status.FORBIDDEN))

    "downloading a statement" should:
      "not be allowed for a student not enrolled on the exam" in:
        val ce = createExam()
        attachments.add("att-s", "statement.txt", "statement")
        store.update(ce.externalRef)(_ ++ Json.obj("languageInspection" -> Json.obj(
          "id" -> 1,
          "statement" -> Json.obj("attachment" -> Json.obj(
            "externalId" -> "att-s",
            "fileName"   -> "statement.txt",
            "mimeType"   -> "text/plain"
          ))
        )))
        val (_, session) = runIO(loginAsStudent())
        statusOf(runIO(get(
          s"/app/iop/collab/attachment/exam/${ce.id}/statement",
          session = session
        )))
          .must(be(Status.FORBIDDEN))

        val enrolment = new ExamEnrolment
        enrolment.user = user("student@funet.fi")
        enrolment.collaborativeExam = ce
        enrolment.save()
        val result =
          runIO(get(s"/app/iop/collab/attachment/exam/${ce.id}/statement", session = session))
        statusOf(result).must(be(Status.OK))
        body(result).must(be("statement"))
