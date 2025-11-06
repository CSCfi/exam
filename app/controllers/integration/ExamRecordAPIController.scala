// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration

import io.ebean.DB
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.admin.ExamScore
import models.assessment.ExamRecord
import org.joda.time.format.ISODateTimeFormat
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.subjectNotPresent

import javax.inject.Inject
import scala.concurrent.ExecutionContext

class ExamRecordAPIController @Inject() (
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def getNewRecords(startDate: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val scores = getScores(startDate)
      Ok(scores.asJson)
    }

  private def getScores(startDate: String): List[ExamScore] =
    val start = ISODateTimeFormat.dateTimeParser().parseDateTime(startDate)
    DB.find(classOf[ExamRecord])
      .fetch("examScore")
      .where()
      .eq("releasable", true)
      .gt("timeStamp", start)
      .list
      .flatMap(record => Option(record.getExamScore))
