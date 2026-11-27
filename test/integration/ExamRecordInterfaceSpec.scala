// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import models.assessment.{ExamRecord, ExamScore}
import org.joda.time.DateTime
import play.api.http.Status
import play.api.libs.json.*

class ExamRecordInterfaceSpec extends BaseIntegrationSpec:

  "ExamRecordInterface" when:
    "getting records" should:
      "return empty array for current date" in:
        val filter = DateTime.now().toString("yyyy-MM-dd")
        val result = runIO(get(s"/integration/record/$filter"))

        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val records = json.as[JsArray]
        records.value must have size 0

      "keep the pre-migration keys" in:
        val score = new ExamScore
        score.studentId = "123"
        score.registrationDate = "2026-01-01"
        score.save()
        val record = new ExamRecord
        record.examScore = score
        record.releasable = true
        record.timeStamp = DateTime.now()
        record.save()

        val result = runIO(get("/integration/record/2000-01-01"))

        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result).as[JsArray].value.head.as[JsObject]
        json.keys mustBe Set(
          "id",
          "objectVersion",
          "studentId",
          "student",
          "identifier",
          "courseUnitCode",
          "examDate",
          "credits",
          "creditLanguage",
          "studentGrade",
          "gradeScale",
          "examScore",
          "courseUnitLevel",
          "courseUnitType",
          "creditType",
          "lecturer",
          "lecturerId",
          "lecturerEmployeeNumber",
          "lecturerFirstName",
          "lecturerLastName",
          "date",
          "courseImplementation",
          "additionalInfo",
          "institutionName"
        )
        (json \ "date").as[String] mustBe "2026-01-01"
        (json \ "studentId").as[String] mustBe "123"
        (json \ "credits").toOption mustBe Some(JsNull)
