// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import io.ebean.DB
import models.exam.{Exam, ExamExecutionType}
import org.joda.time.{DateTime, LocalDateTime}
import play.api.http.Status
import play.api.libs.json.JsArray

import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*

class ExamAPIControllerSpec extends BaseIntegrationSpec:

  private var exams: List[Exam]              = uninitialized
  private var publicType: ExamExecutionType  = uninitialized
  private var privateType: ExamExecutionType = uninitialized

  private def setupExamData(): Unit =
    ensureTestDataLoaded() // Ensure test data is available before accessing database
    val types = DB.find(classOf[ExamExecutionType]).findList().asScala.toList
    publicType = findType(types, ExamExecutionType.Type.PUBLIC).orNull
    privateType = findType(types, ExamExecutionType.Type.PRIVATE).orNull

    val startDate = LocalDateTime.now().plusDays(1)
    val endDate   = LocalDateTime.now().plusDays(10)
    exams = DB.find(classOf[Exam]).findList().asScala.toList

    // Set all exams to start in future
    exams.foreach { exam =>
      exam.setState(Exam.State.PUBLISHED)
      exam.setPeriodStart(startDate.toDateTime)
      exam.setPeriodEnd(endDate.toDateTime)
      exam.setExecutionType(publicType)
      exam.save()
    }

  private def findType(types: List[ExamExecutionType], examType: ExamExecutionType.Type): Option[ExamExecutionType] =
    types.find(_.getType == examType.toString)

  "ExamAPIController" when:
    "getting active exams" should:
      "return filtered active exams based on state and dates" in:
        setupExamData()

        // Ensure we have at least 4 exams for the test
        exams.size must be >= 4

        // Pick first exam and set it already started but not yet ended (included)
        val first = exams.head
        first.setPeriodStart(LocalDateTime.now().minusDays(1).toDateTime)
        first.save()

        // Set second exam already ended (excluded)
        val second = exams(1)
        second.setPeriodStart(LocalDateTime.now().minusDays(2).toDateTime)
        second.setPeriodEnd(LocalDateTime.now().minusDays(1).toDateTime)
        second.save()

        // Set third exam as private (excluded)
        val third = exams(2)
        third.setExecutionType(privateType)
        third.save()

        // Set fourth exam not published (excluded)
        val fourth = exams(3)
        fourth.setState(Exam.State.DRAFT)
        fourth.save()

        // Execute
        val result = runIO(get("/integration/exams/active"))
        statusOf(result).must(be(Status.OK))

        val responseJson = contentAsJsonOf(result)
        responseJson.as[JsArray].value must have size (exams.size - 3)

        val excludedIds = Set(second.getId, third.getId, fourth.getId)
        responseJson.as[JsArray].value.foreach { examNode =>
          val examId = (examNode \ "id").as[Long]
          excludedIds must not contain examId
        }

        // Test with date filter
        val filter         = DateTime.now().minusDays(3).toString("yyyy-MM-dd")
        val filteredResult = runIO(get(s"/integration/exams/active?date=$filter"))
        statusOf(filteredResult).must(be(Status.OK))

        val filteredJson = contentAsJsonOf(filteredResult)
        filteredJson.as[JsArray].value must have size (exams.size - 2)

        val filteredExcludedIds = Set(third.getId, fourth.getId)
        filteredJson.as[JsArray].value.foreach { examNode =>
          val examId = (examNode \ "id").as[Long]
          filteredExcludedIds must not contain examId
        }
