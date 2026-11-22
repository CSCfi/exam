// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package question

import base.BaseIntegrationSpec
import cats.effect.IO
import database.EbeanQueryExtensions
import io.ebean.DB
import models.exam.{Exam, ExamState}
import models.questions.{Question, QuestionType, Tag}
import models.sections.{ExamMaterial, ExamSection, ExamSectionQuestion}
import models.user.User
import play.api.http.Status
import play.api.libs.Files
import play.api.libs.json.*
import play.api.mvc.{MultipartFormData, Result, Session}
import play.api.test.FakeRequest
import play.api.test.Helpers.*

import java.time.Instant
import java.time.temporal.ChronoUnit.DAYS
import scala.jdk.CollectionConverters.*

/** The question library: writing, finding, sharing and removing questions, tags and materials */
class QuestionLibrarySpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def arvon: User              = user("teacher@b.funet.fi")

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def ok(result: Result): Result =
    statusOf(result) must be(Status.OK)
    result

  private def refused(result: Result, status: Int, message: String): Unit =
    statusOf(result) must be(status)
    contentAsStringOf(result) must be(message)

  private def owners(u: User*): JsArray = JsArray(u.map(o => Json.obj("id" -> o.id.longValue)))

  private def essay(teacher: User, changes: (String, Json.JsValueWrapper)*): JsObject =
    Json.obj(
      "type"                  -> "EssayQuestion",
      "question"              -> "<p>Explain</p>",
      "defaultEvaluationType" -> "Points",
      "defaultMaxScore"       -> 5,
      "questionOwners"        -> owners(teacher)
    ) ++ Json.obj(changes*)

  private def option(text: String, correct: Boolean, score: Double = 0): JsObject =
    Json.obj("option" -> text, "correctOption" -> correct, "defaultScore" -> score)

  private def created(body: JsObject, session: Session): Question =
    val result = ok(call("POST", "/app/questions", session, Some(body)))
    DB.find(classOf[Question], (contentAsJsonOf(result) \ "id").as[Long])

  /** A question of someone else's, not shared */
  private def othersQuestion(text: String = "Theirs"): Question =
    ensureTestDataLoaded()
    val q = new Question
    q.`type` = QuestionType.EssayQuestion
    q.question = text
    q.state = "SAVED"
    q.save()
    val saved = DB.find(classOf[Question], q.id)
    saved.questionOwners.add(arvon)
    saved.update()
    saved

  private def inExam(
      q: Question,
      state: ExamState,
      periodEnd: Instant,
      owner: User
  ): ExamSectionQuestion =
    val e = new Exam
    e.name = "Uses it"
    e.state = state
    e.periodEnd = periodEnd
    e.creator = owner
    e.save()
    val withOwner = DB.find(classOf[Exam], e.id)
    withOwner.examOwners.add(owner)
    withOwner.update()
    val s = new ExamSection
    s.exam = e
    s.name = "S"
    s.save()
    val esq = new ExamSectionQuestion
    esq.examSection = s
    esq.question = q
    esq.save()
    esq

  private def ids(result: Result): Set[Long] =
    contentAsJsonOf(ok(result)).as[JsArray].value.map(j => (j \ "id").as[Long]).toSet

  "Writing questions" when:
    "creating one" should:
      "save an essay owned by its writer" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q                  = created(essay(teacher), session)

        q.question must be("<p>Explain</p>")
        q.defaultMaxScore.doubleValue must be(5.0)
        q.state must be("SAVED")
        q.questionOwners.asScala.map(_.id) must contain(teacher.id)

      "say what is missing" in:
        val (teacher, session)     = runIO(loginAsTeacher())
        def create(body: JsObject) = call("POST", "/app/questions", session, Some(body))

        refused(create(essay(teacher) - "question"), Status.BAD_REQUEST, "no question text defined")
        refused(
          create(essay(teacher, "questionOwners" -> Json.arr())),
          Status.BAD_REQUEST,
          "no owners defined"
        )
        refused(
          create(essay(teacher) - "defaultEvaluationType"),
          Status.BAD_REQUEST,
          "no evaluation type defined"
        )
        refused(
          create(essay(teacher) - "defaultMaxScore"),
          Status.BAD_REQUEST,
          "no max score defined"
        )
        refused(
          create(essay(teacher, "type" -> "Nope")),
          Status.BAD_REQUEST,
          "unknown question type"
        )

      "need two options and a right one in a multiple choice question" in:
        val (teacher, session) = runIO(loginAsTeacher())
        def choice(options: JsObject*) = call(
          "POST",
          "/app/questions",
          session,
          Some(essay(teacher, "type" -> "MultipleChoiceQuestion", "options" -> JsArray(options)))
        )

        refused(
          choice(option("Only", true)),
          Status.BAD_REQUEST,
          "i18n_minimum_of_two_options_required"
        )
        refused(
          choice(option("A", false), option("B", false)),
          Status.BAD_REQUEST,
          "i18n_correct_option_required"
        )
        val q = DB.find(
          classOf[Question],
          (contentAsJsonOf(ok(choice(option("A", true), option("B", false)))) \ "id").as[Long]
        )
        q.options.asScala.map(o => o.option -> o.correctOption.booleanValue).toMap must be(
          Map("A" -> true, "B" -> false)
        )

      "need points for some option of a weighted question" in:
        val (teacher, session) = runIO(loginAsTeacher())

        refused(
          call(
            "POST",
            "/app/questions",
            session,
            Some(essay(
              teacher,
              "type"    -> "WeightedMultipleChoiceQuestion",
              "options" -> Json.arr(option("A", false, 0), option("B", false, -1))
            ))
          ),
          Status.BAD_REQUEST,
          "i18n_correct_option_required"
        )

      "check the embedded answers of a cloze test" in:
        val (teacher, session) = runIO(loginAsTeacher())
        def cloze(text: String) = call(
          "POST",
          "/app/questions",
          session,
          Some(essay(teacher, "type" -> "ClozeTestQuestion", "question" -> text))
        )
        def answer(id: String, value: String, precision: String = "0", numeric: Boolean = false) =
          s"""<span cloze="true" id="$id" precision="$precision" numeric="$numeric">$value</span>"""

        refused(cloze("<p>No blanks</p>"), Status.BAD_REQUEST, "no embedded answers")
        refused(
          cloze(s"<p>${answer("a", "x")} ${answer("a", "y")}</p>"),
          Status.BAD_REQUEST,
          "duplicate ids found"
        )
        refused(
          cloze(s"<p>${answer("a", "x", "high")}</p>"),
          Status.BAD_REQUEST,
          "invalid precision found"
        )
        refused(
          cloze(s"<p>${answer("a", "ten", numeric = true)}</p>"),
          Status.BAD_REQUEST,
          "non-numeric correct answer for numeric question"
        )
        ok(cloze(s"<p>Pi is about ${answer("a", "3.14", "0.01", numeric = true)}</p>"))

    "changing one" should:
      "update its text and options" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q = created(
          essay(
            teacher,
            "type" -> "MultipleChoiceQuestion",
            "options" -> Json.arr(
              option("A", true),
              option("B", false)
            )
          ),
          session
        )
        val a = q.options.asScala.find(_.option == "A").get

        ok(call(
          "PUT",
          s"/app/questions/${q.id}",
          session,
          Some(essay(
            teacher,
            "type"     -> "MultipleChoiceQuestion",
            "question" -> "<p>Pick again</p>",
            "options" -> Json.arr(
              Json.obj("id" -> a.id.longValue, "option" -> "A2", "correctOption" -> true),
              option("C", false)
            )
          ))
        ))
        val saved = DB.find(classOf[Question], q.id)
        saved.question must be("<p>Pick again</p>")
        saved.options.asScala.map(_.option).toSet must be(Set("A2", "C"))

      "not change another teacher's question" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q                  = othersQuestion()

        refused(
          call("PUT", s"/app/questions/${q.id}", session, Some(essay(teacher))),
          Status.FORBIDDEN,
          "i18n_error_access_forbidden"
        )
        DB.find(classOf[Question], q.id).question must be("Theirs")

  "Reading questions" when:
    "opening one" should:
      "give the owner's, a shared one and one in the teacher's exam, but no other" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val own                = created(essay(teacher), session)
        val shared             = othersQuestion()
        shared.shared = true
        shared.update()
        val examined = othersQuestion()
        inExam(examined, ExamState.DRAFT, Instant.now().plus(1, DAYS), teacher)
        val hidden = othersQuestion()

        Seq(own, shared, examined).foreach(q => ok(call("GET", s"/app/questions/${q.id}", session)))
        statusOf(call("GET", s"/app/questions/${hidden.id}", session)) must be(Status.FORBIDDEN)

    "listing the library" should:
      "give a teacher their own questions only" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val own                = created(essay(teacher), session)
        val others             = othersQuestion()

        val listed = ids(call("GET", "/app/questions", session))
        listed must contain(own.id)
        listed must not contain others.id
        // Filtering by another owner still keeps to the teacher's own
        ids(call("GET", s"/app/questions?ownerIds=${arvon.id}", session)) must not contain others.id

      "give an administrator nothing until something is chosen" in:
        val (_, session) = runIO(loginAsAdmin())
        val others       = othersQuestion()

        ids(call("GET", "/app/questions", session)) must be(empty)
        ids(call("GET", s"/app/questions?ownerIds=${arvon.id}", session)) must contain(others.id)

    "previewing one" should:
      "show a library question to its owner, hiding a cloze text" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q = created(
          essay(
            teacher,
            "type" -> "ClozeTestQuestion",
            "question" -> """<p>Sky is <span cloze="true" id="c" precision="0" numeric="false">blue</span></p>"""
          ),
          session
        )

        val preview = ok(call("GET", s"/app/questions/${q.id}/preview/library", session))
        contentAsStringOf(preview) must not include "blue"
        statusOf(
          call("GET", s"/app/questions/${othersQuestion().id}/preview/library", session)
        ) must be(
          Status.NOT_FOUND
        )

      "show an exam question to the exam's owner" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val esq = inExam(othersQuestion(), ExamState.DRAFT, Instant.now().plus(1, DAYS), teacher)
        ok(call("GET", s"/app/questions/${esq.id}/preview/exam", session))

        val notMine = inExam(othersQuestion(), ExamState.DRAFT, Instant.now().plus(1, DAYS), arvon)
        statusOf(call("GET", s"/app/questions/${notMine.id}/preview/exam", session)) must be(
          Status.NOT_FOUND
        )

  "Sharing and copying questions" when:
    "adding an owner" should:
      "add them to the teacher's questions" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val (a, b) = (created(essay(teacher), session), created(essay(teacher), session))

        ok(call(
          "POST",
          s"/app/questions/owner/${arvon.id}",
          session,
          Some(Json.obj("questionIds" -> s"${a.id},${b.id}"))
        ))
        Seq(a, b).foreach { q =>
          DB.find(classOf[Question], q.id).questionOwners.asScala.map(_.id) must contain(arvon.id)
        }

      "refuse bad ids, unknown people and questions not the teacher's" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val own                = created(essay(teacher), session)
        def add(uid: Long, ids: String) = call(
          "POST",
          s"/app/questions/owner/$uid",
          session,
          Some(Json.obj("questionIds" -> ids))
        )

        statusOf(add(arvon.id, "x,1")) must be(Status.BAD_REQUEST)
        statusOf(add(arvon.id, "")) must be(Status.BAD_REQUEST)
        statusOf(add(999999, s"${own.id}")) must be(Status.NOT_FOUND)
        statusOf(add(teacher.id, s"${othersQuestion().id}")) must be(Status.NOT_FOUND)

  "Removing questions" when:
    "the owner removes one" should:
      "remove it and its use in exams" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q                  = created(essay(teacher), session)
        val esq                = inExam(q, ExamState.DRAFT, Instant.now().plus(1, DAYS), teacher)

        ok(call("DELETE", s"/app/questions/${q.id}", session))
        Option(DB.find(classOf[Question], q.id)) must be(None)
        Option(DB.find(classOf[ExamSectionQuestion], esq.id)) must be(None)

      "keep one in an exam that is open" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q                  = created(essay(teacher), session)
        inExam(q, ExamState.PUBLISHED, Instant.now().plus(1, DAYS), teacher)

        refused(
          call("DELETE", s"/app/questions/${q.id}", session),
          Status.FORBIDDEN,
          "Question is in use in active exams"
        )
        Option(DB.find(classOf[Question], q.id)) must not be empty

      "not find another teacher's question" in:
        val (_, session) = runIO(loginAsTeacher())
        val q            = othersQuestion()

        statusOf(call("DELETE", s"/app/questions/${q.id}", session)) must be(Status.NOT_FOUND)
        Option(DB.find(classOf[Question], q.id)) must not be empty

  "Importing questions" when:
    "a Moodle file is uploaded" should:
      "create its questions for the teacher" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val before = DB.find(classOf[Question]).where().eq("questionOwners", teacher).list.size
        // A copy, as the uploaded file gets cleaned up after the request
        val copy = java.nio.file.Files.createTempFile("quiz", ".xml")
        java.nio.file.Files.copy(
          java.nio.file.Path.of("test/resources/multichoice-quiz.xml"),
          copy,
          java.nio.file.StandardCopyOption.REPLACE_EXISTING
        )
        val file = Files.SingletonTemporaryFileCreator.create(copy)
        val form = MultipartFormData(
          Map.empty[String, Seq[String]],
          Seq(MultipartFormData.FilePart("file", "quiz.xml", Some("application/xml"), file)),
          Nil
        )
        val request = FakeRequest(POST, "/app/questions/import")
          .withHeaders("Csrf-Token" -> "nocheck")
          .withSession(session.data.toSeq*)
          .withMultipartFormDataBody(form)
        val result = runIO(IO.fromFuture(IO(route(app, request).get)))

        val json = contentAsJsonOf(ok(result))
        (json \ "successCount").as[Int] must be > 0
        DB.find(classOf[Question]).where().eq("questionOwners", teacher).list.size must be(
          before + (json \ "successCount").as[Int]
        )

  "Tags" when:
    "listing and adding them" should:
      "give the teacher's tags and tag questions" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val q = created(essay(teacher, "tags" -> Json.arr(Json.obj("name" -> "Algebra"))), session)
        val tag =
          DB.find(classOf[Tag]).where().eq("name", "algebra").eq("creator", teacher).find.get
        val other = created(essay(teacher), session)

        val listed = contentAsJsonOf(ok(call("GET", "/app/tags?filter=alg", session))).as[JsArray]
        listed.value.map(j => (j \ "id").as[Long]) must be(Seq(tag.id.longValue))
        ok(call(
          "POST",
          "/app/tags/questions",
          session,
          Some(Json.obj("questionIds" -> Json.arr(other.id.longValue), "tagId" -> tag.id.longValue))
        ))
        DB.find(classOf[Question], other.id).tags.asScala.map(_.name) must be(Seq("algebra"))
        DB.find(classOf[Question], q.id).tags.asScala.map(_.name) must be(Seq("algebra"))
        statusOf(call(
          "POST",
          "/app/tags/questions",
          session,
          Some(Json.obj("questionIds" -> Json.arr(other.id.longValue), "tagId" -> 999999))
        )) must be(Status.NOT_FOUND)

  "Exam materials" when:
    "a teacher keeps their materials" should:
      "create, list, change and remove them" in:
        val (_, session) = runIO(loginAsTeacher())
        ensureTestDataLoaded()
        val id = (contentAsJsonOf(ok(call(
          "POST",
          "/app/materials",
          session,
          Some(Json.obj("name" -> "Tables", "author" -> "Someone"))
        ))) \ "id").as[Long]

        ids(call("GET", "/app/materials", session)) must contain(id)
        ok(call(
          "PUT",
          s"/app/materials/$id",
          session,
          Some(Json.obj("name" -> "Log tables", "isbn" -> "123"))
        ))
        val saved = DB.find(classOf[ExamMaterial], id)
        (saved.name, saved.author, saved.isbn) must be(("Log tables", "Someone", "123"))
        ok(call("DELETE", s"/app/materials/$id", session))
        Option(DB.find(classOf[ExamMaterial], id)) must be(None)

      "attach them to sections of the teacher's own exams only" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val id = (contentAsJsonOf(ok(call(
          "POST",
          "/app/materials",
          session,
          Some(Json.obj("name" -> "Tables"))
        ))) \ "id").as[Long]
        val own    = inExam(othersQuestion(), ExamState.DRAFT, Instant.now(), teacher).examSection
        val others = inExam(othersQuestion(), ExamState.DRAFT, Instant.now(), arvon).examSection

        ok(call("POST", s"/app/materials/$id/${own.id}", session))
        DB.find(classOf[ExamSection], own.id).examMaterials.asScala.map(_.id) must contain(id)
        statusOf(call("POST", s"/app/materials/$id/${others.id}", session)) must be(
          Status.NOT_FOUND
        )
        ok(call("DELETE", s"/app/materials/$id/${own.id}", session))
        DB.find(classOf[ExamSection], own.id).examMaterials must be(empty)

      "not touch another teacher's material" in:
        val (_, session) = runIO(loginAsTeacher())
        ensureTestDataLoaded()
        val theirs = new ExamMaterial
        theirs.name = "Theirs"
        theirs.setCreatorWithDate(arvon)
        theirs.save()

        statusOf(call("DELETE", s"/app/materials/${theirs.id}", session)) must be(Status.NOT_FOUND)
        statusOf(call(
          "PUT",
          s"/app/materials/${theirs.id}",
          session,
          Some(Json.obj("name" -> "x"))
        )) must be(
          Status.NOT_FOUND
        )
        ids(call("GET", "/app/materials", session)) must not contain theirs.id.longValue
        Option(DB.find(classOf[ExamMaterial], theirs.id)) must not be empty
