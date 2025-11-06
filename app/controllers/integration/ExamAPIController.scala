// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration

import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.exam.{Exam, ExamExecutionType}
import security.scala.Auth.subjectNotPresent
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamAPIController @Inject() (
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def getActiveExams(date: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val pp = PathProperties.parse(
        "(course(name, code, credits, " +
          "gradeScale(description, externalRef, displayName), organisation(code, name, nameAbbreviation)) " +
          "id, name, periodStart, periodEnd, duration, enrollInstruction, " +
          "examLanguages(code, name), gradeScale(description, externalRef, displayName), " +
          "examOwners(firstName, lastName, email), examType(type)" +
          ")"
      )
      val dateTime = date
        .map(ISODateTimeFormat.dateTimeParser().parseDateTime)
        .getOrElse(DateTime.now())

      val query = DB.find(classOf[Exam])
      query.apply(pp)
      val exams = query
        .where()
        .eq("state", Exam.State.PUBLISHED)
        .ge("periodEnd", dateTime)
        .eq("executionType.type", ExamExecutionType.Type.PUBLIC.toString)
        .list

      Ok(exams.asJson(pp))
    }
