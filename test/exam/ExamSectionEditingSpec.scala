// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.AutoEvaluationConfig
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamState}
import models.questions.*
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.DAYS
import scala.jdk.CollectionConverters.*

/** Building an exam out of sections and questions */
class ExamSectionEditingSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def olli: User               = user("teacher@funet.fi")
  private def arvon: User              = user("teacher@b.funet.fi")

  private def draft(owner: User = olli): Exam =
    ensureTestDataLoaded()
    val e = new Exam
    e.name = "Sections"
    e.state = ExamState.DRAFT
    e.creator = owner
    e.save()
    val saved = DB.find(classOf[Exam], e.id)
    saved.examOwners.add(owner)
    saved.update()
    saved

  private def section(e: Exam, seq: Int, name: String = null): ExamSection =
    val s = new ExamSection
    s.exam = e
    s.name = Option(name).getOrElse(s"Section $seq")
    s.sequenceNumber = seq
    s.lotteryItemCount = 1
    s.save()
    s

  private def question(
      `type`: QuestionType = QuestionType.EssayQuestion,
      text: String = "Q",
      options: Seq[(String, Boolean, Double)] = Nil
  ): Question =
    val q = new Question
    q.`type` = `type`
    q.question = text
    q.defaultMaxScore = 4.0
    q.save()
    options.foreach { (text, correct, score) =>
      val o = new MultipleChoiceOption
      o.question = q
      o.option = text
      o.correctOption = correct
      o.defaultScore = score
      o.save()
    }
    val saved = DB.find(classOf[Question], q.id)
    saved.questionOwners.add(olli)
    saved.update()
    saved

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def add(e: Exam, s: ExamSection, q: Question, seq: Int, session: Session): Result =
    call(
      "POST",
      s"/app/exams/${e.id}/sections/${s.id}/questions/${q.id}",
      session,
      Some(Json.obj("sequenceNumber" -> seq))
    )

  private def ok(result: Result): Result =
    statusOf(result) must be(Status.OK)
    result

  /** The section's questions by their text, in order */
  private def questions(s: ExamSection): Seq[String] =
    DB.find(classOf[ExamSection], s.id).sectionQuestions.asScala.toSeq.sorted.map(
      _.question.question
    )

  private def sectionNames(e: Exam): Seq[String] =
    DB.find(classOf[Exam], e.id).examSections.asScala.toSeq.sorted.map(_.name)

  private def sequences(e: Exam): Seq[Int] =
    DB.find(classOf[Exam], e.id).examSections.asScala.toSeq.sorted.map(_.sequenceNumber)

  private def sectionQuestion(s: ExamSection, q: Question): ExamSectionQuestion =
    DB.find(classOf[ExamSectionQuestion]).where().eq("examSection", s).eq("question", q).find.get

  private def upcomingReservation(e: Exam): Unit =
    val r = new Reservation
    r.startAt = Instant.now().plus(1, DAYS)
    r.endAt = r.startAt.plusSeconds(3600)
    r.save()
    val enrolment = new ExamEnrolment
    enrolment.exam = e
    enrolment.reservation = r
    enrolment.save()

  "Editing exam sections" when:
    "adding sections" should:
      "append them to the owner's exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()

        ok(call("POST", s"/app/exams/${e.id}/sections", session))
        ok(call("POST", s"/app/exams/${e.id}/sections", session))
        sequences(e) must be(Seq(0, 1))

      "refuse another teacher's exam and an unknown one" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(arvon)

        statusOf(call("POST", s"/app/exams/${e.id}/sections", session)) must be(Status.FORBIDDEN)
        statusOf(call("POST", "/app/exams/999999/sections", session)) must be(Status.NOT_FOUND)
        sequences(e) must be(empty)

      "refuse while students have booked an exam with optional sections" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        s.optional = true
        s.update()
        upcomingReservation(e)

        val result = call("POST", s"/app/exams/${e.id}/sections", session)
        statusOf(result) must be(Status.FORBIDDEN)
        contentAsStringOf(result) must be("i18n_error_future_reservations_exist")

    "removing a section" should:
      "close the gap it leaves" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        section(e, 0, "First")
        val middle = section(e, 1, "Middle")
        section(e, 2, "Last")

        ok(call("DELETE", s"/app/exams/${e.id}/sections/${middle.id}", session))
        sectionNames(e) must be(Seq("First", "Last"))
        sequences(e) must be(Seq(0, 1))

    "changing a section" should:
      "store its details, with at least one question drawn" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)

        ok(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}",
          session,
          Some(Json.obj(
            "name"             -> "Renamed",
            "description"      -> "Read carefully",
            "lotteryOn"        -> true,
            "lotteryItemCount" -> 0
          ))
        ))
        val saved = DB.find(classOf[ExamSection], s.id)
        (saved.name, saved.description, saved.lotteryOn, saved.lotteryItemCount) must be(
          ("Renamed", "Read carefully", true, 1)
        )

      "not change optionality once students have booked" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        upcomingReservation(e)

        val result = call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}",
          session,
          Some(Json.obj("name" -> "Renamed", "optional" -> true))
        )
        statusOf(result) must be(Status.FORBIDDEN)
        DB.find(classOf[ExamSection], s.id).optional must be(false)

    "reordering sections" should:
      "move a section to its new place" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        Seq("A", "B", "C").zipWithIndex.foreach((n, i) => section(e, i, n))

        ok(call(
          "PUT",
          s"/app/exams/${e.id}/reorder",
          session,
          Some(Json.obj("from" -> 0, "to" -> 2))
        ))
        sectionNames(e) must be(Seq("B", "C", "A"))
        sequences(e) must be(Seq(0, 1, 2))

      "need both places and the exam's owner" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(arvon)
        Seq("A", "B").zipWithIndex.foreach((n, i) => section(e, i, n))

        statusOf(call("PUT", s"/app/exams/${e.id}/reorder", session, Some(Json.obj("from" -> 0))))
          .must(be(Status.BAD_REQUEST))
        statusOf(call(
          "PUT",
          s"/app/exams/${e.id}/reorder",
          session,
          Some(Json.obj("from" -> 0, "to" -> 1))
        )) must be(Status.FORBIDDEN)
        sectionNames(e) must be(Seq("A", "B"))

  "Editing section questions" when:
    "adding questions" should:
      "put each where asked, keeping the order of the rest" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)

        ok(add(e, s, question(text = "Second"), 0, session))
        ok(add(e, s, question(text = "First"), 0, session))
        // Past the end goes last
        ok(add(e, s, question(text = "Third"), 99, session))
        questions(s) must be(Seq("First", "Second", "Third"))

      "take the question's defaults" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val q = question(
          QuestionType.MultipleChoiceQuestion,
          options =
            Seq(("Right", true, 1.0), ("Wrong", false, 0.0))
        )

        ok(add(e, s, q, 0, session))
        val esq = sectionQuestion(s, q)
        esq.maxScore must be(4.0)
        esq.options.asScala.map(_.option.option).toSet must be(Set("Right", "Wrong"))

      "add several at once" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val (a, b)       = (question(text = "A"), question(text = "B"))

        ok(call(
          "POST",
          s"/app/exams/${e.id}/sections/${s.id}/questions",
          session,
          Some(Json.obj("sequenceNumber" -> 0, "questions" -> s"${a.id},${b.id}"))
        ))
        questions(s).toSet must be(Set("A", "B"))
        statusOf(call(
          "POST",
          s"/app/exams/${e.id}/sections/${s.id}/questions",
          session,
          Some(Json.obj("sequenceNumber" -> 0, "questions" -> "999999"))
        )) must be(Status.NOT_FOUND)

      "not add the same question twice" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val q            = question()

        ok(add(e, s, q, 0, session))
        val again = add(e, s, q, 1, session)
        statusOf(again) must be(Status.BAD_REQUEST)
        contentAsStringOf(again) must be("i18n_question_already_in_section")
        questions(s) must be(Seq("Q"))

      "not add an essay to an automatically graded exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val config       = new AutoEvaluationConfig
        config.exam = e
        config.save()
        val s = section(e, 0)

        statusOf(add(e, s, question(), 0, session)) must be(Status.FORBIDDEN)
        statusOf(call(
          "POST",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${question().id}",
          session,
          Some(Json.obj())
        )) must be(Status.BAD_REQUEST)

      "refuse another teacher's exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(arvon)
        val s            = section(e, 0)

        statusOf(add(e, s, question(), 0, session)) must be(Status.FORBIDDEN)
        questions(s) must be(empty)

    "removing questions" should:
      "close the gap and keep the lottery within the questions left" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val qs           = Seq("A", "B", "C").map(t => question(text = t))
        qs.zipWithIndex.foreach((q, i) => ok(add(e, s, q, i, session)))
        val drawn = DB.find(classOf[ExamSection], s.id)
        drawn.lotteryOn = true
        drawn.lotteryItemCount = 3
        drawn.update()

        ok(call("DELETE", s"/app/exams/${e.id}/sections/${s.id}/questions/${qs(1).id}", session))
        questions(s) must be(Seq("A", "C"))
        DB.find(classOf[ExamSection], s.id).sectionQuestions.asScala.toSeq.sorted
          .map(_.sequenceNumber) must be(Seq(0, 1))
        DB.find(classOf[ExamSection], s.id).lotteryItemCount must be(2)

        ok(call("DELETE", s"/app/exams/${e.id}/sections/${s.id}/questions/${qs.head.id}", session))
        val left = DB.find(classOf[ExamSection], s.id)
        (left.lotteryOn, left.lotteryItemCount) must be((false, 1))

        statusOf(call(
          "DELETE",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${qs.head.id}",
          session
        )) must be(Status.NOT_FOUND)

      "empty the whole section" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        Seq("A", "B").foreach(t => ok(add(e, s, question(text = t), 0, session)))

        ok(call("DELETE", s"/app/exams/${e.id}/sections/${s.id}/questions", session))
        questions(s) must be(empty)
        DB.find(classOf[ExamSection], s.id).lotteryOn must be(false)

    "reordering questions" should:
      "move a question to its new place" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        Seq("A", "B", "C").zipWithIndex.foreach((t, i) =>
          ok(add(e, s, question(text = t), i, session))
        )

        ok(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/reorder",
          session,
          Some(Json.obj("from" -> 2, "to" -> 0))
        ))
        questions(s) must be(Seq("C", "A", "B"))

    "telling whether a question is used in several exams" should:
      "count the exams it is in" in:
        val (_, session) = runIO(loginAsTeacher())
        val q            = question()
        val first        = draft()
        val s            = section(first, 0)
        ok(add(first, s, q, 0, session))
        def distributed: Boolean =
          (contentAsJsonOf(ok(call(
            "GET",
            s"/app/exams/question/${sectionQuestion(s, q).id}/distribution",
            session
          ))) \ "distributed").as[Boolean]

        distributed must be(false)
        val second = draft()
        ok(add(second, section(second, 0), q, 0, session))
        distributed must be(true)

    "resetting an exam question to the question's defaults" should:
      "take the question's current values" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val q            = question()
        ok(add(e, s, q, 0, session))
        val esq = sectionQuestion(s, q)
        esq.maxScore = 1.0
        esq.update()

        ok(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${esq.id}",
          session
        ))
        DB.find(classOf[ExamSectionQuestion], esq.id).maxScore must be(4.0)

    "changing a question used in several exams" should:
      "update, add and remove its options" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val q = question(
          QuestionType.MultipleChoiceQuestion,
          options =
            Seq(("Right", true, 1.0), ("Wrong", false, 0.0))
        )
        ok(add(e, s, q, 0, session))
        val esq   = sectionQuestion(s, q)
        val right = esq.options.asScala.find(_.option.option == "Right").get

        val result = ok(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${esq.id}/distributed",
          session,
          Some(Json.obj(
            "maxScore" -> 2,
            "question" -> Json.obj("question" -> "<p>Pick</p>"),
            "options" -> Json.arr(
              Json.obj(
                "id"    -> right.id.longValue,
                "score" -> 2,
                "option" -> Json.obj(
                  "id"            -> right.option.id.longValue,
                  "option"        -> "Right indeed",
                  "correctOption" -> true
                )
              ),
              Json.obj(
                "score"  -> 0,
                "option" -> Json.obj("option" -> "Also wrong", "correctOption" -> false)
              )
            )
          ))
        ))
        (contentAsJsonOf(result) \ "maxScore").as[Double] must be(2.0)
        val saved = DB.find(classOf[Question], q.id)
        saved.question must be("<p>Pick</p>")
        saved.options.asScala.map(_.option).toSet must be(Set("Right indeed", "Also wrong"))
        DB.find(classOf[ExamSectionQuestion], esq.id).options.asScala
          .map(o => o.option.option -> o.score.doubleValue).toMap must be(
          Map("Right indeed" -> 2.0, "Also wrong" -> 0.0)
        )

      "require a correct option and valid claim choices" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft()
        val s            = section(e, 0)
        val weighted     = question(QuestionType.WeightedMultipleChoiceQuestion)
        val claim        = question(QuestionType.ClaimChoiceQuestion)
        ok(add(e, s, weighted, 0, session))
        ok(add(e, s, claim, 1, session))
        def update(q: Question, options: JsArray) = call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${sectionQuestion(s, q).id}/distributed",
          session,
          Some(Json.obj("question" -> Json.obj("question" -> "Q"), "options" -> options))
        )

        val noPoints = update(weighted, Json.arr(Json.obj("score" -> 0, "option" -> Json.obj())))
        contentAsStringOf(noPoints) must be("i18n_correct_option_required")
        def choice(t: ClaimChoiceOptionType, score: Int) =
          Json.obj("score" -> score, "option" -> Json.obj("claimChoiceType" -> t.toString))
        val noSkip = update(
          claim,
          Json.arr(
            choice(ClaimChoiceOptionType.CorrectOption, 1),
            choice(ClaimChoiceOptionType.IncorrectOption, 0)
          )
        )
        contentAsStringOf(noSkip) must be("i18n_incorrect_claim_question_options")
        statusOf(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${sectionQuestion(s, weighted).id}/distributed",
          session,
          Some(Json.obj("question" -> Json.obj("question" -> "Q")))
        )) must be(Status.BAD_REQUEST)

      "refuse a teacher who does not own the exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = draft(arvon)
        val s            = section(e, 0)
        val q            = question()
        val esq          = new ExamSectionQuestion
        esq.examSection = s
        esq.question = q
        esq.save()

        statusOf(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${esq.id}/distributed",
          session,
          Some(Json.obj("options" -> Json.arr()))
        )) must be(Status.FORBIDDEN)
        statusOf(call(
          "PUT",
          s"/app/exams/${e.id}/sections/${s.id}/questions/${esq.id}",
          session
        )) must be(Status.FORBIDDEN)
