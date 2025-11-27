// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package examination

import base.BaseIntegrationSpec
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, GreenMailUtil, ServerSetupTest}
import io.ebean.DB
import miscellaneous.json.JsonDeserializer
import miscellaneous.scala.DbApiHelper
import models.assessment.{AutoEvaluationConfig, GradeEvaluation}
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Exam, ExamExecutionType}
import models.facility.{ExamMachine, ExamRoom}
import models.questions.MultipleChoiceOption.ClaimChoiceOptionType
import models.questions.Question
import models.sections.{ExamSectionQuestion, ExamSectionQuestionOption}
import models.user.{Language, User}
import org.joda.time.DateTime
import org.scalatest.BeforeAndAfterEach
import play.api.http.Status
import play.api.libs.json.{JsArray, JsNumber, Json}
import play.api.test.Helpers.*

import java.util
import scala.jdk.CollectionConverters.*

class ExaminationControllerSpec extends BaseIntegrationSpec with BeforeAndAfterEach with DbApiHelper:

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

    val user = Option(DB.find(classOf[User], 5L)) match
      case Some(u) => u
      case None    => fail("Test user not found")

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")

    val machine = room.getExamMachines.getFirst
    machine.setIpAddress("127.0.0.1") // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.setMachine(machine)
    reservation.setUser(user)
    reservation.setStartAt(DateTime.now().minusMinutes(10))
    reservation.setEndAt(DateTime.now().plusMinutes(70))
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.setExam(exam)
    enrolment.setUser(user)
    enrolment.setReservation(reservation)
    enrolment.save()

    (exam, machine, enrolment)

  private def setAutoEvaluationConfig(exam: Exam): Unit =
    val config = new AutoEvaluationConfig()
    config.setReleaseType(AutoEvaluationConfig.ReleaseType.IMMEDIATE)
    config.setGradeEvaluations(new java.util.HashSet())
    exam.getGradeScale.getGrades.asScala.foreach { grade =>
      val ge = new GradeEvaluation()
      ge.setGrade(grade)
      ge.setPercentage(20 * Integer.parseInt(grade.getName))
      config.getGradeEvaluations.add(ge)
    }
    config.setExam(exam)
    config.save()

  private def prepareExamination(examHash: String): Exam =
    val result1 = get(s"/app/student/exam/$examHash")
    status(result1) must be(Status.OK)
    val node1 = contentAsJson(result1)
    (node1 \ "cloned").as[Boolean] must be(true)

    val hash = deserialize(classOf[Exam], node1).getHash

    // ROUND 2 with updated hash
    val result2 = get(s"/app/student/exam/$hash")
    val node2   = contentAsJson(result2)
    deserialize(classOf[Exam], node2)

  private def initExamSectionQuestions(exam: Exam): Unit =
    exam.setExamSections(new util.TreeSet(exam.getExamSections))
    exam.getExamInspections.asScala
      .map(_.getUser)
      .foreach { user =>
        user.setLanguage(DB.find(classOf[Language]).where().eq("code", "en").find.orNull)
        user.update()
      }

    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter { esq =>
        esq.getQuestion.getType == Question.Type.MultipleChoiceQuestion ||
        esq.getQuestion.getType == Question.Type.WeightedMultipleChoiceQuestion
      }
      .foreach { esq =>
        esq.getQuestion.getOptions.asScala.foreach { option =>
          val esqo = new ExamSectionQuestionOption()
          esqo.setOption(option)
          esqo.setScore(option.getDefaultScore)
          esq.getOptions.add(esqo)
        }
        esq.save()
      }

  private def deserialize[T](clazz: Class[T], jsValue: play.api.libs.json.JsValue): T =
    val jacksonNode = play.libs.Json.parse(jsValue.toString)
    JsonDeserializer.deserialize(clazz, jacksonNode)

  private def createMultipleChoiceAnswerData(options: ExamSectionQuestionOption*): play.api.libs.json.JsValue =
    val oids = JsArray(options.map(option => JsNumber(BigDecimal(option.getId))))
    Json.obj("oids" -> oids)

  "ExaminationController" when:
    "creating student exams" should:
      "create student exam successfully" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, enrolment) = setupTestData()

          val studentExam = prepareExamination(exam.getHash)
          studentExam.getName must be(exam.getName)
          studentExam.getCourse.getId must be(exam.getCourse.getId)
          studentExam.getInstruction must be(exam.getInstruction)

          val esSize = exam.getExamSections.asScala.count(!_.isOptional)
          studentExam.getExamSections must have size esSize
          studentExam.getHash must not be exam.getHash
          studentExam.getExamLanguages must have size exam.getExamLanguages.size
          studentExam.getDuration must be(exam.getDuration)

          DB.find(classOf[Exam]).where().eq("hash", studentExam.getHash).find must not be empty
          DB.find(classOf[ExamEnrolment]).where().eq("id", enrolment.getId).find match
            case Some(ee) => ee.getExam.getHash must be(studentExam.getHash)
            case None     => fail("Enrolment not found")

          DB.find(classOf[ExamParticipation]).where().eq("exam.id", studentExam.getId).find match
            case Some(participation) =>
              participation.getStarted must not be null
              participation.getUser.getId must be(user.getId)
            case None => fail("Participation not found")
        }

      "reject creation with wrong IP" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, machine, _) = setupTestData()

          // Change IP to simulate different machine
          machine.setIpAddress("127.0.0.2")
          machine.update()

          val result = get(s"/app/student/exam/${exam.getHash}", session = session)
          status(result) must be(Status.FORBIDDEN)

          // Verify no student exam was created
          DB.find(classOf[Exam]).where().eq("parent.id", exam.getId).list must have size 0
        }

      "prevent creating multiple student exams" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()

          val result1 = get(s"/app/student/exam/${exam.getHash}", session = session)
          status(result1) must be(Status.OK)

          // Try again
          val result2 = get(s"/app/student/exam/${exam.getHash}", session = session)
          status(result2) must be(Status.FORBIDDEN)

          // Verify only one student exam was created
          DB.find(classOf[Exam]).where().eq("parent.id", exam.getId).list must have size 1
        }

      "return existing student exam when already started" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, enrolment) = setupTestData()

          val result1 = get(s"/app/student/exam/${exam.getHash}", session = session)
          status(result1) must be(Status.OK)
          val node1       = contentAsJson(result1)
          val studentExam = deserialize(classOf[Exam], node1)

          // Try again with student exam hash
          val result2 = get(s"/app/student/exam/${studentExam.getHash}", session = session)
          status(result2) must be(Status.OK)
          val node2              = contentAsJson(result2)
          val anotherStudentExam = deserialize(classOf[Exam], node2)

          // Verify that the same exam is returned
          studentExam.getId must be(anotherStudentExam.getId)

          DB.find(classOf[ExamEnrolment]).where().eq("id", enrolment.getId).find match
            case Some(ee) => ee.getExam.getHash must be(studentExam.getHash)
            case None     => fail("Enrolment not found")

          DB.find(classOf[ExamParticipation]).where().eq("exam.id", studentExam.getId).find match
            case Some(participation) =>
              participation.getStarted must not be null
              participation.getUser.getId must be(user.getId)
            case None => fail("Participation not found")
        }

    "answering questions" should:
      "answer multiple choice question successfully" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()
          val studentExam  = prepareExamination(exam.getHash)

          val question = DB
            .find(classOf[ExamSectionQuestion])
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.MultipleChoiceQuestion)
            .list
            .headOption match
            case Some(q) => q
            case None    => fail("Multiple choice question not found")

          val options    = question.getOptions.asScala.toList
          val answerData = createMultipleChoiceAnswerData(options.head)

          val result1 = makeRequest(
            POST,
            s"/app/student/exam/${studentExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = session
          )
          status(result1) must be(Status.OK)

          // Change answer
          val newAnswerData = createMultipleChoiceAnswerData(options.last)
          val result2 = makeRequest(
            POST,
            s"/app/student/exam/${studentExam.getHash}/question/${question.getId}/option",
            Some(newAnswerData),
            session = session
          )
          status(result2) must be(Status.OK)
        }

      "reject answer with wrong IP" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, machine, _) = setupTestData()
          val studentExam        = prepareExamination(exam.getHash)

          val question = DB
            .find(classOf[ExamSectionQuestion])
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.MultipleChoiceQuestion)
            .list
            .headOption match
            case Some(q) => q
            case None    => fail("Multiple choice question not found")

          val options = question.getOptions.asScala.toList

          // Change IP to simulate different machine
          machine.setIpAddress("127.0.0.2")
          machine.update()

          val answerData = createMultipleChoiceAnswerData(options.head)
          val result = makeRequest(
            POST,
            s"/app/student/exam/${studentExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = session
          )
          status(result) must be(Status.FORBIDDEN)
        }

      "reject cloze test question with invalid JSON" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()
          val studentExam  = prepareExamination(exam.getHash)

          val question = DB
            .find(classOf[ExamSectionQuestion])
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.ClozeTestQuestion)
            .list
            .headOption match
            case Some(q) => q
            case None    => fail("Cloze test question not found")

          val invalidAnswer = "{\"foo\": \"bar"
          val answerData = Json.obj(
            "answer"        -> invalidAnswer,
            "objectVersion" -> JsNumber(BigDecimal(1))
          )

          val result = makeRequest(
            POST,
            s"/app/student/exam/${studentExam.getHash}/clozetest/${question.getId}",
            Some(answerData),
            session = session
          )
          status(result) must be(Status.BAD_REQUEST)
        }

      "handle claim choice question option order and skip answer" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()
          val studentExam  = prepareExamination(exam.getHash)

          val question = DB
            .find(classOf[ExamSectionQuestion])
            .where()
            .eq("examSection.exam", studentExam)
            .eq("question.type", Question.Type.ClaimChoiceQuestion)
            .list
            .headOption match
            case Some(q) => q
            case None    => fail("Claim choice question not found")

          val options = question.getOptions.asScala.toList

          // Check option order and types
          options.head.getScore must be(-1)
          options.head.getOption.getClaimChoiceType must be(ClaimChoiceOptionType.CorrectOption)
          options(1).getScore must be(1)
          options(1).getOption.getClaimChoiceType must be(ClaimChoiceOptionType.IncorrectOption)
          options(2).getOption.getClaimChoiceType must be(ClaimChoiceOptionType.SkipOption)

          // Answer with a skip option
          val answerData = createMultipleChoiceAnswerData(options(2))
          val result = makeRequest(
            POST,
            s"/app/student/exam/${studentExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = session
          )
          status(result) must be(Status.OK)
        }

    "completing exams" should:
      "complete exam and auto-evaluate" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()
          setAutoEvaluationConfig(exam)
          val studentExam = prepareExamination(exam.getHash)

          // Answer all questions
          studentExam.getExamSections.asScala
            .flatMap(_.getSectionQuestions.asScala)
            .foreach { esq =>
              val question = esq.getQuestion
              question.getType match
                case Question.Type.EssayQuestion =>
                  val body = Json.obj("answer" -> "this is my answer")
                  val bodyWithVersion = Option(esq.getEssayAnswer) match
                    case Some(answer) if answer.getObjectVersion > 0 =>
                      body + ("objectVersion" -> JsNumber(BigDecimal(answer.getObjectVersion)))
                    case _ => body

                  val result = makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.getHash}/question/${esq.getId}",
                    Some(bodyWithVersion),
                    session = session
                  )
                  status(result) must be(Status.OK)

                case Question.Type.ClozeTestQuestion =>
                  val content = Json.obj(
                    "answer" -> Json.obj(
                      "1" -> "this is my answer for cloze 1",
                      "2" -> "this is my answer for cloze 2"
                    )
                  )
                  val contentWithVersion = Option(esq.getClozeTestAnswer) match
                    case Some(answer) if answer.getObjectVersion > 0 =>
                      content + ("objectVersion" -> JsNumber(BigDecimal(answer.getObjectVersion)))
                    case _ => content

                  val result = makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.getHash}/clozetest/${esq.getId}",
                    Some(contentWithVersion),
                    session = session
                  )
                  status(result) must be(Status.OK)

                case _ =>
                  val sectionQuestion = DB
                    .find(classOf[ExamSectionQuestion])
                    .where()
                    .eq("examSection.exam", studentExam)
                    .eq("question.type", Question.Type.MultipleChoiceQuestion)
                    .list
                    .headOption match
                    case Some(q) => q
                    case None    => fail("Multiple choice question not found")

                  val options    = sectionQuestion.getOptions.asScala.toList
                  val answerData = createMultipleChoiceAnswerData(options.head)

                  val result = makeRequest(
                    POST,
                    s"/app/student/exam/${studentExam.getHash}/question/${esq.getId}/option",
                    Some(answerData),
                    session = session
                  )
                  status(result) must be(Status.OK)
            }

          // Submit exam
          val result = put(s"/app/student/exam/${studentExam.getHash}", Json.obj(), session = session)
          status(result) must be(Status.OK)

          // Verify exam is graded
          Option(DB.find(classOf[Exam], studentExam.getId)) match
            case Some(turnedExam) =>
              turnedExam.getGrade must not be null
              turnedExam.getState must be(Exam.State.GRADED)
            case None => fail("Turned exam not found")

          greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
        }

    "handling private exams" should:
      "complete private exam and send notification" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()

          // Set exam as private
          exam.setExecutionType(
            DB.find(classOf[ExamExecutionType])
              .where()
              .eq("type", ExamExecutionType.Type.PRIVATE.toString)
              .find
              .orNull
          )
          exam.update()

          val studentExam = prepareExamination(exam.getHash)
          val result      = put(s"/app/student/exam/${studentExam.getHash}", Json.obj(), session = session)
          status(result) must be(Status.OK)

          // Check email notification
          greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
          val mails = greenMail.getReceivedMessages
          mails must have size 1
          mails(0).getFrom()(0).toString must include("no-reply@exam.org")
          mails(0).getSubject must be("Personal exam has been returned")
          val body              = GreenMailUtil.getBody(mails(0))
          val reviewLink        = s"http://uni.org/staff/assessments/${studentExam.getId}"
          val reviewLinkElement = s"""<a href="$reviewLink">Link to evaluation</a>"""
          body must include(reviewLinkElement)
        }

      "abort private exam and send notification" in:
        loginAsStudent().map { case (user, session) =>
          val (exam, _, _) = setupTestData()

          // Set exam as private
          exam.setExecutionType(
            DB.find(classOf[ExamExecutionType])
              .where()
              .eq("type", ExamExecutionType.Type.PRIVATE.toString)
              .find
              .orNull
          )
          exam.update()

          val studentExam = prepareExamination(exam.getHash)
          val result      = put(s"/app/student/exam/abort/${studentExam.getHash}", Json.obj(), session = session)
          status(result) must be(Status.OK)

          // Check email notification
          greenMail.waitForIncomingEmail(MAIL_TIMEOUT, 1) must be(true)
          val mails = greenMail.getReceivedMessages
          mails must have size 1
          mails(0).getFrom()(0).toString must include("no-reply@exam.org")
          mails(0).getSubject must be("Personal exam has been abandoned")
          val body = GreenMailUtil.getBody(mails(0))
          // Make sure there is no review link
          body must not include "<a href"
        }
