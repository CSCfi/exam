// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import com.google.common.io.Files
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, ServerSetupTest}
import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.json.EJson
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.{Exam, ExamState}
import models.facility.{ExamMachine, ExamRoom}
import models.iop.ExternalExam
import models.questions.QuestionType
import models.sections.ExamSectionQuestionOption
import models.user.User
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.{JsArray, JsObject, Json}
import play.api.test.Helpers.*
import services.json.JsonDeserializer

import java.io.File
import java.nio.charset.StandardCharsets
import java.time.{Duration, Instant}
import java.util.UUID
import scala.jdk.CollectionConverters.*

class ExternalExaminationControllerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterEach
    with BeforeAndAfterAll
    with Matchers
    with EbeanQueryExtensions:

  private lazy val greenMail = new GreenMail(ServerSetupTest.SMTP)
    .withConfiguration(new GreenMailConfiguration().withDisabledAuthentication())

  private def startGreenMail(): Unit = if !greenMail.isRunning then greenMail.start()
  private def stopGreenMail(): Unit  = if greenMail.isRunning then greenMail.stop()

  override def beforeAll(): Unit =
    super.beforeAll()
    startGreenMail()

  override def afterAll(): Unit =
    try
      stopGreenMail()
    finally
      super.afterAll()

  override def beforeEach(): Unit =
    super.beforeEach()
    greenMail.purgeEmailFromAllMailboxes()

  private def setupTestData(): (Exam, ExternalExam, ExamEnrolment, ExamMachine) =
    ensureTestDataLoaded()

    // Clean up existing enrolments
    DB.find(classOf[ExamEnrolment]).list.foreach(_.delete())

    val user = DB.find(classOf[User]).where().eq("email", "student@funet.fi").find match
      case Some(u) => u
      case None    => fail("Test user not found")

    val ee = new ExternalExam()
    ee.externalRef = UUID.randomUUID().toString
    ee.hash = UUID.randomUUID().toString
    ee.created = Instant.now()
    ee.creator = user
    ee.content =
      EJson.parseObject(
        Files.asCharSource(new File("test/resources/enrolment.json"), StandardCharsets.UTF_8).read()
      )

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")
    val machine = room.examMachines.get(0)
    machine.ipAddress = "127.0.0.1" // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.machine = machine
    reservation.user = user
    reservation.startAt = Instant.now().minus(Duration.ofMinutes(10))
    reservation.endAt = Instant.now().plus(Duration.ofMinutes(70))
    reservation.externalUserRef = user.eppn
    reservation.externalRef = "foobar"
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.externalExam = ee
    enrolment.user = user
    enrolment.reservation = reservation
    enrolment.save()

    val mapper = new ObjectMapper()
    val json   = mapper.writeValueAsString(ee.content)
    val node   = mapper.readTree(json)
    val exam   = JsonDeserializer.deserialize(classOf[Exam], node)

    (exam, ee, enrolment, machine)

  "ExternalExaminationController" when:
    "creating student exam" should:
      "create student exam successfully" in:
        val (exam, _, enrolment, _) = setupTestData()
        val (user, session)         = runIO(loginAsStudent())
        // Execute
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)

        // Verify
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        studentExam.name.must(be(exam.name))
        studentExam.course.id.must(be(exam.course.id))
        studentExam.instruction.must(be(exam.instruction))
        studentExam.examSections.must(have size exam.examSections.size)
        studentExam.examSections.iterator.next.sectionQuestions
          .must(have size exam.examSections.iterator.next.sectionQuestions.size)
        studentExam.hash.must(be(exam.hash))
        studentExam.examLanguages.must(have size exam.examLanguages.size)
        studentExam.duration.must(be(exam.duration))

      "reject student exam with wrong IP" in:
        val (_, _, enrolment, machine) = setupTestData()
        machine.ipAddress = "127.0.0.2"
        machine.update()

        val (user, session) = runIO(loginAsStudent())
        // Execute
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)
        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.FORBIDDEN)

      "handle already created student exam" in:
        val (_, _, enrolment, _) = setupTestData()
        val (user, session)      = runIO(loginAsStudent())
        // Execute first time
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result1Final     = runIO(get(redirectLocation, session = session))
        statusOf(result1Final) must be(Status.OK)

        val started =
          DB.find(classOf[ExternalExam])
            .where()
            .eq("hash", enrolment.externalExam.hash)
            .find match
            case Some(ee) => ee.started
            case None     => fail("External exam not found")

        // Try again
        val result2 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result2) must be(Status.SEE_OTHER)

        val redirectLocation2 =
          headerOf(result2, "Location").getOrElse(fail("No redirect location"))
        val result2Final = runIO(get(redirectLocation2, session = session))
        statusOf(result2Final) must be(Status.OK)

        // Check that the starting time did not change
        val newStarted =
          DB.find(classOf[ExternalExam])
            .where()
            .eq("hash", enrolment.externalExam.hash)
            .find match
            case Some(ee) => ee.started
            case None     => fail("External exam not found")
        newStarted.must(be(started))

    "answering questions" should:
      "answer multiple choice question successfully" in:
        val (_, ee, enrolment, _) = setupTestData()
        val (user, session)       = runIO(loginAsStudent())
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        val question = studentExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .find(_.question.`type` == QuestionType.MultipleChoiceQuestion)
          .getOrElse(fail("No multiple choice question found"))

        val option     = question.options.iterator.next
        val answerData = createMultipleChoiceAnswerData(option)

        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.externalExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(postResult) must be(Status.OK)

        // Check that an option was marked as answered in the database
        val savedExternalExam =
          Option(DB.find(classOf[ExternalExam]).where().eq("hash", ee.hash).findOne()) match
            case Some(ee) => ee
            case None     => fail("External exam not found")
        val savedExam = savedExternalExam.deserialize
        val savedQuestion = savedExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .find(_.id == question.id)
          .getOrElse(fail("Question not found"))

        val answeredCount = savedQuestion.options.asScala.count(_.answered)
        answeredCount.must(be > 0)

      "reject multiple choice question with wrong IP" in:
        val (_, _, enrolment, machine) = setupTestData()
        val (_, userSession)           = runIO(loginAsStudent())
        val result1 = runIO(get(
          s"/app/student/exam/${enrolment.externalExam.hash}",
          session = userSession
        ))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = userSession))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        val question = studentExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .find(_.question.`type` == QuestionType.MultipleChoiceQuestion)
          .getOrElse(fail("No multiple choice question found"))

        val option = question.options.iterator.next

        // Change IP of the reservation machine to simulate that the student is on a different machine now
        machine.ipAddress = "127.0.0.2"
        machine.update()

        val answerData = createMultipleChoiceAnswerData(option)
        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.externalExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = userSession
          )
        )
        statusOf(postResult) must be(Status.FORBIDDEN)

      "complete full exam workflow" in:
        val (_, _, enrolment, _) = setupTestData()
        val (user, session)      = runIO(loginAsStudent())
        val hash                 = enrolment.externalExam.hash
        val result1              = runIO(get(s"/app/student/exam/$hash", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        // Answer all questions
        studentExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .foreach { esq =>
            val question = esq.question
            question.`type` match
              case QuestionType.EssayQuestion =>
                val body        = Json.obj("answer" -> "this is my answer")
                val essayAnswer = esq.essayAnswer
                val bodyWithVersion =
                  if essayAnswer != null && essayAnswer.objectVersion > 0 then
                    body + ("objectVersion" -> Json.toJson(essayAnswer.objectVersion))
                  else body

                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/question/${esq.id}",
                    Some(bodyWithVersion),
                    session = session
                  )
                )
                statusOf(r) must be(Status.OK)

              case QuestionType.ClozeTestQuestion =>
                val content = Json.obj(
                  "answer" -> Json.obj(
                    "1" -> "this is my answer for cloze 1",
                    "2" -> "this is my answer for cloze 2"
                  )
                )
                val clozeAnswer = esq.clozeTestAnswer
                val contentWithVersion =
                  if clozeAnswer != null && clozeAnswer.objectVersion > 0 then
                    content + ("objectVersion" -> Json.toJson(clozeAnswer.objectVersion))
                  else content

                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/clozetest/${esq.id}",
                    Some(contentWithVersion),
                    session = session
                  )
                )
                statusOf(r) must be(Status.OK)

              case _ =>
                val option     = esq.options.iterator.next
                val answerData = createMultipleChoiceAnswerData(option)
                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/question/${esq.id}/option",
                    Some(answerData),
                    session = session
                  )
                )
                statusOf(r) must be(Status.OK)
          }

        // Submit exam
        val submitResult = runIO(put(s"/app/iop/student/exam/$hash", Json.obj(), session = session))
        statusOf(submitResult) must be(Status.OK)

        val turnedExam =
          Option(DB.find(classOf[ExternalExam]).where().eq("hash", hash).findOne()) match
            case Some(ee) => ee
            case None     => fail("External exam not found")
        turnedExam.finished.must(not be null)

        val content = turnedExam.deserialize
        content.state.must(be(ExamState.REVIEW))

        // Briefly check that some of the above answers are there
        val examMapper  = new ObjectMapper()
        val textualExam = examMapper.writeValueAsString(content)
        textualExam.must(include("cloze 1"))
        textualExam.must(include("cloze 2"))
        textualExam.must(include("this is my answer"))

      "answer skip on claim choice question" in:
        val (_, _, enrolment, _) = setupTestData()
        val (user, session)      = runIO(loginAsStudent())
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.externalExam.hash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        val question = studentExam.examSections.asScala
          .flatMap(_.sectionQuestions.asScala)
          .find(_.question.`type` == QuestionType.ClaimChoiceQuestion)
          .getOrElse(fail("No claim choice question found"))

        val options = question.options.asScala.toList

        options.head.option.option.must(be("Tosi"))
        options(1).option.option.must(be("Epätosi"))
        options(2).option.option.must(be("En osaa sanoa"))

        val answerData = createMultipleChoiceAnswerData(options(2))
        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.externalExam.hash}/question/${question.id}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(postResult) must be(Status.OK)

  private def createMultipleChoiceAnswerData(options: ExamSectionQuestionOption*): JsObject =
    val oids = JsArray(options.map(option => Json.toJson(option.id.longValue)))
    Json.obj("oids" -> oids)
