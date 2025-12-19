// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import com.google.common.io.Files
import com.icegreen.greenmail.configuration.GreenMailConfiguration
import com.icegreen.greenmail.util.{GreenMail, ServerSetupTest}
import io.ebean.DB
import io.ebean.text.json.EJson
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, Reservation}
import models.exam.Exam
import models.facility.{ExamMachine, ExamRoom}
import models.iop.ExternalExam
import models.questions.Question
import models.sections.ExamSectionQuestionOption
import models.user.User
import org.joda.time.DateTime
import org.scalatest.matchers.must.Matchers
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.{JsArray, JsObject, Json}
import play.api.test.Helpers._
import services.json.JsonDeserializer

import java.io.File
import java.nio.charset.StandardCharsets
import java.util.UUID
import scala.jdk.CollectionConverters._

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
    ee.setExternalRef(UUID.randomUUID().toString)
    ee.setHash(UUID.randomUUID().toString)
    ee.setCreated(DateTime.now())
    ee.setCreator(user)
    ee.setContent(
      EJson.parseObject(
        Files.asCharSource(new File("test/resources/enrolment.json"), StandardCharsets.UTF_8).read()
      )
    )

    val room = Option(DB.find(classOf[ExamRoom], 1L)) match
      case Some(r) => r
      case None    => fail("Test room not found")
    val machine = room.getExamMachines.get(0)
    machine.setIpAddress("127.0.0.1") // so that the IP check won't fail
    machine.update()

    val reservation = new Reservation()
    reservation.setMachine(machine)
    reservation.setUser(user)
    reservation.setStartAt(DateTime.now().minusMinutes(10))
    reservation.setEndAt(DateTime.now().plusMinutes(70))
    reservation.setExternalUserRef(user.getEppn)
    reservation.setExternalRef("foobar")
    reservation.save()

    val enrolment = new ExamEnrolment()
    enrolment.setExternalExam(ee)
    enrolment.setUser(user)
    enrolment.setReservation(reservation)
    enrolment.save()

    val mapper = new ObjectMapper()
    val json   = mapper.writeValueAsString(ee.getContent)
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
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)

        // Verify
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        studentExam.getName.must(be(exam.getName))
        studentExam.getCourse.getId.must(be(exam.getCourse.getId))
        studentExam.getInstruction.must(be(exam.getInstruction))
        studentExam.getExamSections.must(have size exam.getExamSections.size)
        studentExam.getExamSections.iterator.next.getSectionQuestions
          .must(have size exam.getExamSections.iterator.next.getSectionQuestions.size)
        studentExam.getHash.must(be(exam.getHash))
        studentExam.getExamLanguages.must(have size exam.getExamLanguages.size)
        studentExam.getDuration.must(be(exam.getDuration))

      "reject student exam with wrong IP" in:
        val (_, _, enrolment, machine) = setupTestData()
        machine.setIpAddress("127.0.0.2")
        machine.update()

        val (user, session) = runIO(loginAsStudent())
        // Execute
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)
        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.FORBIDDEN)

      "handle already created student exam" in:
        val (_, _, enrolment, _) = setupTestData()
        val (user, session)      = runIO(loginAsStudent())
        // Execute first time
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result1Final     = runIO(get(redirectLocation, session = session))
        statusOf(result1Final) must be(Status.OK)

        val started =
          DB.find(classOf[ExternalExam])
            .where()
            .eq("hash", enrolment.getExternalExam.getHash)
            .find match
            case Some(ee) => ee.getStarted
            case None     => fail("External exam not found")

        // Try again
        val result2 =
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result2) must be(Status.SEE_OTHER)

        val redirectLocation2 =
          headerOf(result2, "Location").getOrElse(fail("No redirect location"))
        val result2Final = runIO(get(redirectLocation2, session = session))
        statusOf(result2Final) must be(Status.OK)

        // Check that the starting time did not change
        val newStarted =
          DB.find(classOf[ExternalExam])
            .where()
            .eq("hash", enrolment.getExternalExam.getHash)
            .find match
            case Some(ee) => ee.getStarted
            case None     => fail("External exam not found")
        newStarted.must(be(started))

    "answering questions" should:
      "answer multiple choice question successfully" in:
        val (_, ee, enrolment, _) = setupTestData()
        val (user, session)       = runIO(loginAsStudent())
        val result1 =
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        val question = studentExam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .find(_.getQuestion.getType == Question.Type.MultipleChoiceQuestion)
          .getOrElse(fail("No multiple choice question found"))

        val option     = question.getOptions.iterator.next
        val answerData = createMultipleChoiceAnswerData(option)

        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.getExternalExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(postResult) must be(Status.OK)

        // Check that an option was marked as answered in the database
        val savedExternalExam =
          Option(DB.find(classOf[ExternalExam]).where().eq("hash", ee.getHash).findOne()) match
            case Some(ee) => ee
            case None     => fail("External exam not found")
        val savedExam = savedExternalExam.deserialize()
        val savedQuestion = savedExam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .find(_.getId == question.getId)
          .getOrElse(fail("Question not found"))

        val answeredCount = savedQuestion.getOptions.asScala.count(_.isAnswered)
        answeredCount.must(be > 0)

      "reject multiple choice question with wrong IP" in:
        val (_, _, enrolment, machine) = setupTestData()
        val (_, userSession)           = runIO(loginAsStudent())
        val result1 = runIO(get(
          s"/app/student/exam/${enrolment.getExternalExam.getHash}",
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

        val question = studentExam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .find(_.getQuestion.getType == Question.Type.MultipleChoiceQuestion)
          .getOrElse(fail("No multiple choice question found"))

        val option = question.getOptions.iterator.next

        // Change IP of the reservation machine to simulate that the student is on a different machine now
        machine.setIpAddress("127.0.0.2")
        machine.update()

        val answerData = createMultipleChoiceAnswerData(option)
        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.getExternalExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = userSession
          )
        )
        statusOf(postResult) must be(Status.FORBIDDEN)

      "complete full exam workflow" in:
        val (_, _, enrolment, _) = setupTestData()
        val (user, session)      = runIO(loginAsStudent())
        val hash                 = enrolment.getExternalExam.getHash
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
        studentExam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .foreach { esq =>
            val question = esq.getQuestion
            question.getType match
              case Question.Type.EssayQuestion =>
                val body        = Json.obj("answer" -> "this is my answer")
                val essayAnswer = esq.getEssayAnswer
                val bodyWithVersion =
                  if essayAnswer != null && essayAnswer.getObjectVersion > 0 then
                    body + ("objectVersion" -> Json.toJson(essayAnswer.getObjectVersion))
                  else body

                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/question/${esq.getId}",
                    Some(bodyWithVersion),
                    session = session
                  )
                )
                statusOf(r) must be(Status.OK)

              case Question.Type.ClozeTestQuestion =>
                val content = Json.obj(
                  "answer" -> Json.obj(
                    "1" -> "this is my answer for cloze 1",
                    "2" -> "this is my answer for cloze 2"
                  )
                )
                val clozeAnswer = esq.getClozeTestAnswer
                val contentWithVersion =
                  if clozeAnswer != null && clozeAnswer.getObjectVersion > 0 then
                    content + ("objectVersion" -> Json.toJson(clozeAnswer.getObjectVersion))
                  else content

                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/clozetest/${esq.getId}",
                    Some(contentWithVersion),
                    session = session
                  )
                )
                statusOf(r) must be(Status.OK)

              case _ =>
                val option     = esq.getOptions.iterator.next
                val answerData = createMultipleChoiceAnswerData(option)
                val r = runIO(
                  makeRequest(
                    POST,
                    s"/app/iop/student/exam/$hash/question/${esq.getId}/option",
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
        turnedExam.getFinished.must(not be null)

        val content = turnedExam.deserialize()
        content.getState.must(be(Exam.State.REVIEW))

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
          runIO(get(s"/app/student/exam/${enrolment.getExternalExam.getHash}", session = session))
        statusOf(result1) must be(Status.SEE_OTHER)

        val redirectLocation = headerOf(result1, "Location").getOrElse(fail("No redirect location"))
        val result2          = runIO(get(redirectLocation, session = session))
        statusOf(result2) must be(Status.OK)
        val node        = contentAsJsonOf(result2)
        val mapper      = new ObjectMapper()
        val jacksonNode = mapper.readTree(node.toString)
        val studentExam = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)

        val question = studentExam.getExamSections.asScala
          .flatMap(_.getSectionQuestions.asScala)
          .find(_.getQuestion.getType == Question.Type.ClaimChoiceQuestion)
          .getOrElse(fail("No claim choice question found"))

        val options = question.getOptions.asScala.toList

        options.head.getOption.getOption.must(be("Tosi"))
        options(1).getOption.getOption.must(be("Epätosi"))
        options(2).getOption.getOption.must(be("En osaa sanoa"))

        val answerData = createMultipleChoiceAnswerData(options(2))
        val postResult = runIO(
          makeRequest(
            POST,
            s"/app/iop/student/exam/${enrolment.getExternalExam.getHash}/question/${question.getId}/option",
            Some(answerData),
            session = session
          )
        )
        statusOf(postResult) must be(Status.OK)

  private def createMultipleChoiceAnswerData(options: ExamSectionQuestionOption*): JsObject =
    val oids = JsArray(options.map(option => Json.toJson(option.getId.longValue)))
    Json.obj("oids" -> oids)
