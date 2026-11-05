// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import io.ebean.DB
import models.exam.{Exam, GradeScale}
import play.api.Application
import play.api.http.Status
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.*

class ExamGradeScaleSpec extends BaseIntegrationSpec:

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .configure("exam.course.gradescale.overridable" -> false)
      .build()

  "ExamController" when:
    "updating an exam without a course while grade scale is not overridable" should:
      "save the exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = DB.find(classOf[Exam], 1L)
        exam.course = null
        exam.save()
        val scale = DB.find(classOf[GradeScale]).setMaxRows(1).findList().get(0)

        val updateData = Json.obj(
          "name"     -> "renamed copy",
          "duration" -> JsNumber(BigDecimal(exam.duration)),
          "grading"  -> JsNumber(BigDecimal(scale.id))
        )
        val result = runIO(put(s"/app/exams/${exam.id}", updateData, session = session))

        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "name").as[String].must(be("renamed copy"))
