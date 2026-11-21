// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import io.ebean.DB
import models.exam.ExamState
import models.iop.CollaborativeExam
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*
import play.api.mvc.Session

/** Creating, finding and editing collaborative exams, whose content lives in XM. */
class CollaborativeExamControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with EbeanQueryExtensions:

  private val Port                   = 31251
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

  private def localExam(id: Long): Option[CollaborativeExam] =
    Option(DB.find(classOf[CollaborativeExam], id))

  /** A new draft created through the API, as XM stores it */
  private def createDraft(): CollaborativeExam =
    val (_, session) = runIO(loginAsAdmin())
    val result       = runIO(post("/app/iop/exams", session))
    statusOf(result).must(be(Status.CREATED))
    localExam((contentAsJsonOf(result) \ "id").as[Long]).get

  private def owner(email: String, id: Long = 9001L) = Json.obj("id" -> id, "email" -> email)

  /** Published with the teacher as its owner */
  private def publishForTeacher(ce: CollaborativeExam, name: String = "Shared exam"): Unit =
    store.update(ce.externalRef)(_ ++ Json.obj(
      "name"       -> name,
      "state"      -> ExamState.PUBLISHED.toString,
      "examOwners" -> Json.arr(owner("teacher@funet.fi"))
    ))

  private def doc(ce: CollaborativeExam): JsObject = store.get(ce.externalRef).get

  private def ownerEmails(ce: CollaborativeExam): Seq[String] =
    (doc(ce) \ "examOwners").as[Seq[JsObject]].map(o => (o \ "email").as[String])

  private def search(session: Session, filter: Option[String] = None): Seq[JsObject] =
    val result =
      runIO(get(s"/app/iop/exams${filter.fold("")(f => s"?filter=$f")}", session = session))
    statusOf(result).must(be(Status.OK))
    contentAsJsonOf(result).as[Seq[JsObject]]

  "CollaborativeExamController" when:
    "creating an exam" should:
      "store a draft in XM and reference it locally" in:
        val ce = createDraft()
        ce.state.must(be(ExamState.DRAFT))
        ce.anonymous.must(be(true))
        val stored = doc(ce)
        (stored \ "state").as[String].must(be("DRAFT"))
        (stored \ "examSections").as[Seq[JsObject]].size.must(be(1))
        (stored \ "examLanguages").as[Seq[JsObject]].map(l => (l \ "code").as[String])
          .must(be(Seq("fi")))

      "answer with XM's error and keep nothing when XM fails" in:
        val (_, session) = runIO(loginAsAdmin())
        store.failWith = Some(Status.SERVICE_UNAVAILABLE)

        val result = runIO(post("/app/iop/exams", session))
        statusOf(result).must(be(Status.INTERNAL_SERVER_ERROR))
        contentAsStringOf(result).must(be("XM failure"))
        DB.find(classOf[CollaborativeExam]).findCount().must(be(0))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(post("/app/iop/exams", session))).must(be(Status.FORBIDDEN))

    "listing grade scales" should:
      "list the local scales to teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        val result       = runIO(get("/app/iop/gradescales", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].must(not(be(empty)))

    "searching exams" should:
      "show an admin every exam, with local ids" in:
        val ce = createDraft()
        // An exam another organisation created, not yet known here
        store.put("remote-exam", doc(ce) ++ Json.obj("name" -> "Remote exam"))
        val (_, session) = runIO(loginAsAdmin())

        val found = search(session)
        found.size.must(be(2))
        val remote = DB.find(classOf[CollaborativeExam]).where().eq("externalRef", "remote-exam")
          .find.get
        found.map(e => (e \ "id").as[Long]).toSet
          .must(be(Set(ce.id.longValue, remote.id.longValue)))

      "show a teacher only the published exams they own" in:
        val owned = createDraft()
        publishForTeacher(owned)
        val draft = createDraft()
        store.update(draft.externalRef)(
          _ ++ Json.obj("examOwners" -> Json.arr(owner("teacher@funet.fi")))
        )
        val others = createDraft()
        store.update(others.externalRef)(_ ++ Json.obj(
          "state"      -> "PUBLISHED",
          "examOwners" -> Json.arr(owner("someone@else.fi"))
        ))
        val (_, session) = runIO(loginAsTeacher())

        search(session).map(e => (e \ "id").as[Long]).must(be(Seq(owned.id.longValue)))

      "pass the filter to XM" in:
        val first = createDraft()
        store.update(first.externalRef)(_ ++ Json.obj("name" -> "Statistics"))
        val second = createDraft()
        store.update(second.externalRef)(_ ++ Json.obj("name" -> "Physics"))
        val (_, session) = runIO(loginAsAdmin())

        search(session, Some("stat")).map(e => (e \ "name").as[String]).must(be(Seq("Statistics")))

      "answer 500 when XM fails" in:
        val (_, session) = runIO(loginAsAdmin())
        store.failWith = Some(Status.BAD_GATEWAY)
        statusOf(runIO(get("/app/iop/exams", session = session)))
          .must(be(Status.INTERNAL_SERVER_ERROR))

    "getting an exam" should:
      "return the XM document with the local id" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(get(s"/app/iop/exams/${ce.id}", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "id").as[Long].must(be(ce.id.longValue))
        (contentAsJsonOf(result) \ "_id").as[String].must(be(ce.externalRef))

      "return a published exam to its owner" in:
        val ce = createDraft()
        publishForTeacher(ce)
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"/app/iop/exams/${ce.id}", session = session))).must(be(Status.OK))

      "hide a draft from its owner" in:
        val ce = createDraft()
        store.update(ce.externalRef)(
          _ ++ Json.obj("examOwners" -> Json.arr(owner("teacher@funet.fi")))
        )
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"/app/iop/exams/${ce.id}", session = session)))
          .must(be(Status.NOT_FOUND))

      "hide an exam restricted to other organisations" in:
        val ce = createDraft()
        publishForTeacher(ce)
        store.update(ce.externalRef)(_ ++ Json.obj("organisations" -> "other-org;third-org"))
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get(s"/app/iop/exams/${ce.id}", session = session)))
          .must(be(Status.NOT_FOUND))

      "answer 404 for an unknown exam or one missing from XM" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get("/app/iop/exams/999", session = session))).must(be(Status.NOT_FOUND))
        store.reset()
        statusOf(runIO(get(s"/app/iop/exams/${ce.id}", session = session)))
          .must(be(Status.NOT_FOUND))

    "updating an exam" should:
      "save the changes to XM and return the new document" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        val body         = Json.obj("name" -> "Renamed", "duration" -> 90)

        val result = runIO(put(s"/app/iop/exams/${ce.id}", body, session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "name").as[String].must(be("Renamed"))
        (contentAsJsonOf(result) \ "id").as[Long].must(be(ce.id.longValue))
        ((doc(ce) \ "name").as[String], (doc(ce) \ "duration").as[Int]).must(be(("Renamed", 90)))

      "reject a payload without a name" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put(s"/app/iop/exams/${ce.id}", Json.obj("duration" -> 90), session)))
          .must(be(Status.BAD_REQUEST))

      "not let a teacher edit an exam they do not own" in:
        val ce = createDraft()
        store.update(ce.externalRef)(_ ++ Json.obj(
          "state"      -> "PUBLISHED",
          "examOwners" -> Json.arr(owner("someone@else.fi"))
        ))
        val (_, session) = runIO(loginAsTeacher())
        val body         = Json.obj("name" -> "Renamed", "duration" -> 90)
        statusOf(runIO(put(s"/app/iop/exams/${ce.id}", body, session)))
          .must(be(Status.FORBIDDEN))
        (doc(ce) \ "name").as[String].must(be(""))

    "deleting an exam" should:
      "remove a draft from XM and locally" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}", session))).must(be(Status.OK))
        store.get(ce.externalRef).must(be(None))
        localExam(ce.id).must(be(None))

      "refuse a published exam" in:
        val ce = createDraft()
        ce.state = ExamState.PUBLISHED
        ce.update()
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}", session))).must(be(Status.FORBIDDEN))
        store.get(ce.externalRef).must(not(be(None)))

      "keep the local reference when XM fails" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        store.failWith = Some(Status.INTERNAL_SERVER_ERROR)
        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}", session)))
          .must(be(Status.INTERNAL_SERVER_ERROR))
        localExam(ce.id).must(not(be(None)))

    "toggling an exam language" should:
      "add and remove it" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        def languages =
          (doc(ce) \ "examLanguages").as[Seq[JsObject]].map(l => (l \ "code").as[String]).toSet

        statusOf(runIO(put(s"/app/iop/exams/${ce.id}/language/sv", JsObject.empty, session)))
          .must(be(Status.OK))
        languages.must(be(Set("fi", "sv")))
        statusOf(runIO(put(s"/app/iop/exams/${ce.id}/language/fi", JsObject.empty, session)))
          .must(be(Status.OK))
        languages.must(be(Set("sv")))

    "adding an owner" should:
      "add them by email" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        val result = runIO(makeRequest(
          "POST",
          s"/app/iop/exams/${ce.id}/owners",
          Some(Json.obj("email" -> "colleague@other.fi")),
          session = session
        ))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "email").as[String].must(be("colleague@other.fi"))
        ownerEmails(ce).must(be(Seq("colleague@other.fi")))

      "reject a missing or invalid email" in:
        val ce           = createDraft()
        val (_, session) = runIO(loginAsAdmin())
        def add(body: JsObject) =
          runIO(makeRequest(
            "POST",
            s"/app/iop/exams/${ce.id}/owners",
            Some(body),
            session = session
          ))

        contentAsStringOf(add(Json.obj())).must(be("i18n_error_email_missing"))
        contentAsStringOf(add(Json.obj("email" -> "not an email"))).must(be(
          "i18n_error_email_invalid"
        ))
        ownerEmails(ce).must(be(empty))

    "removing an owner" should:
      "remove them" in:
        val ce = createDraft()
        store.update(ce.externalRef)(_ ++ Json.obj(
          "examOwners" -> Json.arr(owner("one@other.fi", 11L), owner("two@other.fi", 12L))
        ))
        val (_, session) = runIO(loginAsAdmin())

        statusOf(runIO(delete(s"/app/iop/exams/${ce.id}/owners/11", session))).must(be(Status.OK))
        ownerEmails(ce).must(be(Seq("two@other.fi")))
