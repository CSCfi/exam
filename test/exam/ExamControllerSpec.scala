// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import io.ebean.DB
import models.exam.{Exam, ExamState, ExamType}
import play.api.http.Status
import play.api.libs.json.*
import play.api.test.Helpers.*

import java.time.{Duration, Instant}
import scala.jdk.CollectionConverters.*

class ExamControllerSpec extends BaseIntegrationSpec:

  "ExamController" when:
    "getting active exams" should:
      "deny access to students" in:
        val (user, session) = runIO(loginAsStudent())
        val result          = runIO(get("/app/reviewerexams", session = session))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).toLowerCase.must(be("authentication failure"))

      "return active exams for teachers" in:
        val (user, session) = runIO(loginAsTeacher())
        // Setup - find active exams created by this user
        val activeExams = DB
          .find(classOf[Exam])
          .where()
          .eq("creator.id", user.id)
          .in("state", ExamState.PUBLISHED, ExamState.SAVED, ExamState.DRAFT)
          .findList()

        activeExams.asScala.foreach { exam =>
          exam.examOwners.add(exam.creator)
          exam.update()
        }

        val ids = activeExams.asScala.map { exam =>
          exam.periodStart = Instant.now()
          exam.periodEnd = Instant.now().plus(Duration.ofDays(7))
          exam.update()
          exam.id
        }.toSet

        // Execute
        val result = runIO(get("/app/reviewerexams", session = session))

        // Verify
        statusOf(result).must(be(Status.OK))
        val examsJson = contentAsJsonOf(result).as[JsArray]
        examsJson.value must have size ids.size

        examsJson.value.foreach { examNode =>
          val examId      = (examNode \ "id").as[Long]
          val periodEnd   = (examNode \ "periodEnd").as[String]
          val periodStart = (examNode \ "periodStart").as[String]

          ids must contain(examId)
          // Verify period dates are set (basic validation)
          periodEnd must not be empty
          periodStart must not be empty
        }

    "creating draft exams" should:
      "deny access to students" in:
        val (user, session) = runIO(loginAsStudent())
        val examData = Json.obj(
          "implementation" -> "AQUARIUM",
          "executionType"  -> Json.obj("type" -> "PUBLIC")
        )

        val result = runIO(makeRequest(POST, "/app/exams", Some(examData), session = session))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).toLowerCase.must(be("authentication failure"))

      "create draft exam for teachers" in:
        val (user, session) = runIO(loginAsTeacher())
        // Setup
        val originalRowCount = DB.find(classOf[Exam]).findCount()

        val examData = Json.obj(
          "implementation" -> "AQUARIUM",
          "executionType"  -> Json.obj("type" -> "PUBLIC")
        )

        // Execute
        val result = runIO(makeRequest(POST, "/app/exams", Some(examData), session = session))

        // Verify
        statusOf(result).must(be(Status.OK))
        val responseJson = contentAsJsonOf(result)
        val examId       = (responseJson \ "id").as[Long]

        val draft = DB.find(classOf[Exam], examId)
        draft must not be null
        Option(draft.name) must be(None)
        draft.creator.id must be(user.id)
        draft.created must not be null
        draft.state must be(ExamState.DRAFT)
        draft.examSections must have size 1

        val section = draft.examSections.iterator().next()
        Option(section.name) must be(None)
        section.expanded must be(true)
        draft.examLanguages must have size 1
        draft.examLanguages.getFirst.code must be("fi")
        draft.examType.id must be(2L)
        draft.anonymous must be(true)

        val newRowCount = DB.find(classOf[Exam]).findCount()
        newRowCount must be(originalRowCount + 1)

    "getting student exams" should:
      "not allow access to student-started exams" in:
        val (user, session) = runIO(loginAsTeacher())
        // Setup
        val examId = 1L
        val exam   = DB.find(classOf[Exam], examId)
        exam.state = ExamState.STUDENT_STARTED
        exam.update()

        // Execute
        val result = runIO(get(s"/app/exams/$examId", session = session))
        statusOf(result).must(be(Status.NOT_FOUND))

    "updating exam type" should:
      "update exam type successfully" in:
        val (user, session) = runIO(loginAsTeacher())
        // Setup
        val examId   = 1L
        val exam     = DB.find(classOf[Exam], examId)
        val examType = DB.find(classOf[ExamType], 1L)
        exam.examType = examType
        exam.save()

        // Check current state
        val examPath  = s"/app/exams/$examId"
        val getResult = runIO(get(examPath, session = session))
        statusOf(getResult).must(be(Status.OK))
        val examJson = contentAsJsonOf(getResult)

        (examJson \ "examType").isDefined must be(true)
        (examJson \ "examType" \ "type").as[String] must be("PARTIAL")

        // Prepare update
        val updateData = Json.obj(
          "name"     -> exam.name,
          "duration" -> JsNumber(BigDecimal(exam.duration)),
          "examType" -> Json.obj("type" -> "FINAL")
        )

        // Send update
        val putResult = runIO(put(examPath, updateData, session = session))

        statusOf(putResult) must be(Status.OK)
        val updatedJson  = contentAsJsonOf(putResult)
        val examTypeJson = updatedJson \ "examType"
        (examTypeJson \ "type").as[String].must(be("FINAL"))
