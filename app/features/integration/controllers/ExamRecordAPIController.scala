// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.controllers

import features.integration.services.ExamRecordAPIService
import models.assessment.ExamScore
import play.api.libs.json.*
import play.api.mvc.*
import security.Auth.subjectNotPresent
import security.BlockingIOExecutionContext

import javax.inject.Inject

object ExamRecordAPIController:
  // The record API is read by registry integrations, so the keys are kept as they were before the
  // Scala migration (Jackson): registrationDate is sent as "date" and the record is left out.
  // Ebean's JSON ignores the Jackson annotations on ExamScore that used to do this.
  private def str(value: String): JsValue = Option(value).fold(JsNull)(JsString(_))

  def toJson(score: ExamScore): JsObject = Json.obj(
    "id"                     -> score.id.longValue,
    "objectVersion"          -> score.objectVersion,
    "studentId"              -> str(score.studentId),
    "student"                -> str(score.student),
    "identifier"             -> str(score.identifier),
    "courseUnitCode"         -> str(score.courseUnitCode),
    "examDate"               -> str(score.examDate),
    "credits"                -> str(score.credits),
    "creditLanguage"         -> str(score.creditLanguage),
    "studentGrade"           -> str(score.studentGrade),
    "gradeScale"             -> str(score.gradeScale),
    "examScore"              -> str(score.examScore),
    "courseUnitLevel"        -> str(score.courseUnitLevel),
    "courseUnitType"         -> str(score.courseUnitType),
    "creditType"             -> str(score.creditType),
    "lecturer"               -> str(score.lecturer),
    "lecturerId"             -> str(score.lecturerId),
    "lecturerEmployeeNumber" -> str(score.lecturerEmployeeNumber),
    "lecturerFirstName"      -> str(score.lecturerFirstName),
    "lecturerLastName"       -> str(score.lecturerLastName),
    "date"                   -> str(score.registrationDate),
    "courseImplementation"   -> str(score.courseImplementation),
    "additionalInfo"         -> str(score.additionalInfo),
    "institutionName"        -> str(score.institutionName)
  )

class ExamRecordAPIController @Inject() (
    private val examRecordAPIService: ExamRecordAPIService,
    val controllerComponents: ControllerComponents,
    implicit val ec: BlockingIOExecutionContext
) extends BaseController:

  def getNewRecords(startDate: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val scores = examRecordAPIService.getNewRecords(startDate)
      Ok(JsArray(scores.map(ExamRecordAPIController.toJson)))
    }
