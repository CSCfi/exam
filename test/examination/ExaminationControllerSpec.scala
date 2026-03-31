// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package examination

import base.BaseIntegrationSpec
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.{AutoEvaluationConfig, AutoEvaluationReleaseType, GradeEvaluation}
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Exam, ExamExecutionType, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.questions.{ClaimChoiceOptionType, QuestionType}
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Language, User}
import org.scalatest.BeforeAndAfterEach
import play.api.http.Status
import play.api.libs.json.{JsArray, JsNumber, Json}
import play.api.test.Helpers.*
import services.json.JsonDeserializer

import java.time.{Duration, Instant}
import java.util
import scala.jdk.CollectionConverters.*

class ExaminationControllerSpec extends BaseIntegrationSpec with BeforeAndAfterEach
    with EbeanQueryExtensions:

  private val MAIL_TIMEOUT = 20000L

  // GreenMail setup for email testing
  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  override def beforeEach(): Unit =
    super.beforeEach()
    startGreenMail()
    greenMail.purgeEmailFromAllMailboxes()

  override def afterEach(): Unit =
    try
      stopGreenMail()
    finally
      super.afterEach()

  private def setupTestData(): (Exam, ExamMachine, ExamEnrolment) =
    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val exam = Option(DB.find(classOf[Exam], 1L)) match
      case Some(e) =>
        initExamSectionQuestions(e)
        e
      case None => fail("Test exam not found")

    val user = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    val machine = room.examMachines.getFirst
    machine.ipAddress = "127.0.0.1" // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.machine = machine
    reservation.user = user
    reservation.startAt = Instant.now().minus(Duration.ofMinutes(10))
    reservation.endAt = Instant.now().plus(Duration.ofMinutes(70))
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.exam = exam
    enrolment.user = user
    enrolment.reservation = reservation
    enrolment.save()

    (exam, machine, enrolment)

  private def setAutoEvaluationConfig(exam: Exam): Unit =
    val config = new AutoEvaluationConfig()
    config.releaseType = AutoEvaluationReleaseType.IMMEDIATE
    config.gradeEvaluations = new java.util.HashSet()
    exam.gradeScale.grades.asScala.foreach { grade =>
      val ge = new GradeEvaluation()
      ge.grade = grade
      ge.percentage = 20 * Integer.parseInt(grade.name)
      config.gradeEvaluations.add(ge)
    }
    config.exam = exam
    config.save()

  private def prepareExamination(examHash: String, session: play.api.mvc.Session): Exam =
    val result1 = runIO(get(s"/app/student/exam/$examHash", session = session))
    statusOf(result1) must be(Status.OK)
    val node1 = contentAsJsonOf(result1)
    (node1 \ "cloned").as[Boolean] must be(true)

    val hash = deserialize(classOf[Exam], node1).hash

    // ROUND 2 with updated hash
    val result2 = runIO(get(s"/app/student/exam/$hash", session = session))
    val node2   = contentAsJsonOf(result2)
    deserialize(classOf[Exam], node2)

  private def initExamSectionQuestions(exam: Exam): Unit =
    exam.examSections = new util.TreeSet(exam.examSections)
    exam.examInspections.asScala
      .map(_.user)
      .foreach { user =>
        user.language = DB.find(classOf[Language]).where().eq("code", "en").find.orNull
        user.update()
      }

    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter { esq =>
        esq.question.`type` == QuestionType.MultipleChoiceQuestion ||
        esq.question.`type` == QuestionType.WeightedMultipleChoiceQuestion
      }
      .foreach { esq =>
        esq.question.options.asScala.foreach { option =>
          val esqo = new ExamSectionQuestionOption()
          esqo.option = option
          esqo.score = option.defaultScore
          esq.options.add(esqo)
        }
        esq.save()
      }

  private def deserialize[T](clazz: Class[T], jsValue: play.api.libs.json.JsValue): T =
    val jacksonNode = play.libs.Json.parse(jsValue.toString)
    JsonDeserializer.deserialize(clazz, jacksonNode)

  private def createMultipleChoiceAnswerData(options: ExamSectionQuestionOption*)
      : play.api.libs.json.JsValue =
    val oids = JsArray(options.map(option => JsNumber(BigDecimal(option.id))))
    Json.obj("oids" -> oids)

  "ExaminationController" when:
    "creating student exams" should:
      "create student exam successfully" in:
        val (user, session)      = runIO(loginAsStudent())
        val (exam, _, enrolment) = setupTestData()

        val studentExam = prepareExamination(exam.hash, session)
        studentExam.name must be(exam.name)
        studentExam.course.id must be(exam.course.id)
        studentExam.instruction must be(exam.instruction)

        val esSize = exam.examSections.asScala.count(!_.optional)
        studentExam.examSections must have size esSize
        studentExam.hash must not be exam.hash
        studentExam.examLanguages must have size exam.examLanguages.size
        studentExam.duration must be(exam.duration)

        DB.find(classOf[Exam]).where().eq("hash", studentExam.hash).find must not be empty
        DB.find(classOf[ExamEnrolment]).where().eq("id", enrolment.id).find match
          case Some(ee) => ee.exam.hash must be(studentExam.hash)
          case None     => fail("Enrolment not found")

        DB.find(classOf[ExamParticipation]).where().eq("exam.id", studentExam.id).find match
          case Some(participation) =>
            participation.started must not be null
            participation.user.id must be(user.id)
          case None => fail("Participation not found")

      "reject creation with wrong IP" in:
        val (user, session)    = runIO(loginAsStudent())
        val (exam, machine, _) = setupTestData()

        // Change IP to simulate different machine
        machine.ipAddress = "127.0.0.2"
        machine.update()

        val result = runIO(get(s"/app/student/exam/${exam.hash}", session = session))
        statusOf(result) must be(Status.FORBIDDEN)

        // Verify no student exam was created
        DB.find(classOf[Exam]).where().eq("parent.id", exam.id).list must have size 0

      "prevent creating multiple student exams" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()

        val result1 = runIO(get(s"/app/student/exam/${exam.hash}", session = session))
        statusOf(result1) must be(Status.OK)

        // Try again
        val result2 = runIO(get(s"/app/student/exam/${exam.hash}", session = session))
        statusOf(result2) must be(Status.FORBIDDEN)

        // Verify only one student exam was created
        DB.find(classOf[Exam]).where().eq("parent.id", exam.id).list must have size 1

      "return existing student exam when already started" in:
        val (user, session)      = runIO(loginAsStudent())
        val (exam, _, enrolment) = setupTestData()

        val result1 = runIO(get(s"/app/student/exam/${exam.hash}", session = session))
        statusOf(result1) must be(Status.OK)
        val node1       = contentAsJsonOf(result1)
        val studentExam = deserialize(classOf[Exam], node1)

        // Try again with student exam hash
        val result2 = runIO(get(s"/app/student/exam/${studentExam.hash}", session = session))
        statusOf(result2) must be(Status.OK)
        val node2              = contentAsJsonOf(result2)
        val anotherStudentExam = deserialize(classOf[Exam], node2)

        // Verify that the same exam is returned
        studentExam.id must be(anotherStudentExam.id)

        DB.find(classOf[ExamEnrolment]).where().eq("id", enrolment.id).find match
          case Some(ee) => ee.exam.hash must be(studentExam.hash)
          case None     => fail("Enrolment not found")

        DB.find(classOf[ExamParticipation]).where().eq("exam.id", studentExam.id).find match
          case Some(participation) =>
            participation.started must not be null
            participation.user.id must be(user.id)
          case None => fail("Participation not found")

    "answering questions" should:
      "answer multiple choice question successfully" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()
        val studentExam     = prepareExamination(exam.hash, session)

        val question = DB
          .find(classOf[ExamSectionQuestion])
          .where()
          .eq("examSection.exam", studentExam)
          .eq("question.type", QuestionType.MultipleChoiceQuestion)
          .list
          .headOption match
          case Some(q) => q
          case None    => fail("Multiple choice question not found")

        val options    = question.options.asScala.toList
        val answerData = createMultipleChoiceAnswerData(options.head)

        val result1 = runIO(
          makeRequest(
            POST,
            s"/app/student/exam/${studentExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(result1) must be(Status.OK)

        // Change answer
        val newAnswerData = createMultipleChoiceAnswerData(options.last)
        val result2 = runIO(
          makeRequest(
            POST,
            s"/app/student/exam/${studentExam.hash}/question/${question.id}/option",
            Some(newAnswerData),
            session = session
          )
        )
        statusOf(result2) must be(Status.OK)

      "reject answer with wrong IP" in:
        val (user, session)    = runIO(loginAsStudent())
        val (exam, machine, _) = setupTestData()
        val studentExam        = prepareExamination(exam.hash, session)

        val question = DB
          .find(classOf[ExamSectionQuestion])
          .where()
          .eq("examSection.exam", studentExam)
          .eq("question.type", QuestionType.MultipleChoiceQuestion)
          .list
          .headOption match
          case Some(q) => q
          case None    => fail("Multiple choice question not found")

        val options = question.options.asScala.toList

        // Change IP to simulate different machine
        machine.ipAddress = "127.0.0.2"
        machine.update()

        val answerData = createMultipleChoiceAnswerData(options.head)
        val result = runIO(
          makeRequest(
            POST,
            s"/app/student/exam/${studentExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(result) must be(Status.FORBIDDEN)

      "reject cloze test question with invalid JSON" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()
        val studentExam     = prepareExamination(exam.hash, session)

        val question = DB
          .find(classOf[ExamSectionQuestion])
          .where()
          .eq("examSection.exam", studentExam)
          .eq("question.type", QuestionType.ClozeTestQuestion)
          .list
          .headOption match
          case Some(q) => q
          case None    => fail("Cloze test question not found")

        val invalidAnswer = "{\"foo\": \"bar"
        val answerData = Json.obj(
          "answer"        -> invalidAnswer,
          "objectVersion" -> JsNumber(BigDecimal(1))
        )

        val result = runIO(
          makeRequest(
            POST,
            s"/app/student/exam/${studentExam.hash}/clozetest/${question.id}",
            Some(answerData),
            session = session
          )
        )
        statusOf(result) must be(Status.BAD_REQUEST)

      "handle claim choice question option order and skip answer" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()
        val studentExam     = prepareExamination(exam.hash, session)

        val question = DB
          .find(classOf[ExamSectionQuestion])
          .where()
          .eq("examSection.exam", studentExam)
          .eq("question.type", QuestionType.ClaimChoiceQuestion)
          .list
          .headOption match
          case Some(q) => q
          case None    => fail("Claim choice question not found")

        val options = question.options.asScala.toList

        // Check option order and types
        options.head.score must be(-1)
        options.head.option.claimChoiceType must be(ClaimChoiceOptionType.CorrectOption)
        options(1).score must be(1)
        options(1).option.claimChoiceType must be(ClaimChoiceOptionType.IncorrectOption)
        options(2).option.claimChoiceType must be(ClaimChoiceOptionType.SkipOption)

        // Answer with a skip option
        val answerData = createMultipleChoiceAnswerData(options(2))
        val result = runIO(
          makeRequest(
            POST,
            s"/app/student/exam/${studentExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(result) must be(Status.OK)

    "completing exams" should:
      "complete exam and auto-evaluate" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()
        setAutoEvaluationConfig(exam)
        val studentExam = prepareExamination(exam.hash, session)

        // Answer all questions
        studentExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .foreach { esq =>
            val question = esq.question
            question.`type` match
              case QuestionType.EssayQuestion =>
                val body = Json.obj("answer" -> "this is my answer")
                val bodyWithVersion = Option(esq.essayAnswer) match
                  case Some(answer) if answer.objectVersion > 0 =>
                    body + ("objectVersion" -> JsNumber(BigDecimal(answer.objectVersion)))
                  case _ => body

                val result = runIO(
                  makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.hash}/question/${esq.id}",
                    Some(bodyWithVersion),
                    session = session
                  )
                )
                statusOf(result) must be(Status.OK)

              case QuestionType.ClozeTestQuestion =>
                val content = Json.obj(
                  "answer" -> Json.obj(
                    "1" -> "this is my answer for cloze 1",
                    "2" -> "this is my answer for cloze 2"
                  )
                )
                val contentWithVersion = Option(esq.clozeTestAnswer) match
                  case Some(answer) if answer.objectVersion > 0 =>
                    content + ("objectVersion" -> JsNumber(BigDecimal(answer.objectVersion)))
                  case _ => content

                val result = runIO(
                  makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.hash}/clozetest/${esq.id}",
                    Some(contentWithVersion),
                    session = session
                  )
                )
                statusOf(result) must be(Status.OK)

              case _ =>
                val sectionQuestion = DB
                  .find(classOf[ExamSectionQuestion])
                  .where()
                  .eq("examSection.exam", studentExam)
                  .eq("question.type", QuestionType.MultipleChoiceQuestion)
                  .list
                  .headOption match
                  case Some(q) => q
                  case None    => fail("Multiple choice question not found")

                val options    = sectionQuestion.options.asScala.toList
                val answerData = createMultipleChoiceAnswerData(options.head)

                val result = runIO(
                  makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.hash}/question/${esq.id}/option",
                    Some(answerData),
                    session = session
                  )
                )
                statusOf(result) must be(Status.OK)
          }

        // Submit exam
        val result =
          runIO(put(s"/app/student/exam/${studentExam.hash}", Json.obj(), session = session))
        statusOf(result) must be(Status.OK)

        // Verify exam is graded
        Option(DB.find(classOf[Exam], studentExam.id)) match
          case Some(turnedExam) =>
            turnedExam.grade must not be null
            turnedExam.state must be(ExamState.GRADED)
          case None => fail("Turned exam not found")

        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)

    "handling private exams" should:
      "complete private exam and send notification" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()

        // Set exam as private
        exam.executionType =
          DB.find(classOf[ExamExecutionType])
            .where()
            .eq("type", ExamExecutionType.Type.PRIVATE.toString)
            .find
            .orNull

        exam.update()

        val studentExam = prepareExamination(exam.hash, session)
        val result =
          runIO(put(s"/app/student/exam/${studentExam.hash}", Json.obj(), session = session))
        statusOf(result) must be(Status.OK)

        // Check email notification
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1
        mails(0).getFrom()(0).toString must include("no-reply@exam.org")
        mails(0).getSubject must be("Personal exam has been returned")
        val body              = GreenMailUtil.getBody(mails(0))
        val reviewLink        = s"http://uni.org/staff/assessments/${studentExam.id}"
        val reviewLinkElement = s"""<a href="$reviewLink">Link to evaluation</a>"""
        body must include(reviewLinkElement)

      "abort private exam and send notification" in:
        val (user, session) = runIO(loginAsStudent())
        val (exam, _, _)    = setupTestData()

        // Set exam as private
        exam.executionType =
          DB.find(classOf[ExamExecutionType])
            .where()
            .eq("type", ExamExecutionType.Type.PRIVATE.toString)
            .find
            .orNull

        exam.update()

        val studentExam = prepareExamination(exam.hash, session)
        val result = runIO(put(
          s"/app/student/exam/abort/${studentExam.hash}",
          Json.obj(),
          session = session
        ))
        statusOf(result) must be(Status.OK)

        // Check email notification
        greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        val mails = greenMail.getReceivedMessages
        mails must have size 1
        mails(0).getFrom()(0).toString must include("no-reply@exam.org")
        mails(0).getSubject must be("Personal exam has been abandoned")
        val body = GreenMailUtil.getBody(mails(0))
        // Make sure there is no review link
        body must not include "<a href"
