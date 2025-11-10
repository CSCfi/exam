// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.api

import com.google.inject.ImplementedBy
import controllers.iop.collaboration.impl.CollaborativeExamLoaderImpl
import io.ebean.Model
import io.ebean.text.PathProperties
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User
import play.api.libs.json.JsValue
import play.api.mvc.Result

import scala.concurrent.Future

@ImplementedBy(classOf[CollaborativeExamLoaderImpl])
trait CollaborativeExamLoader:
  def downloadExam(ce: CollaborativeExam): Future[Option[Exam]]
  def downloadAssessment(examRef: String, assessmentRef: String): Future[Option[JsValue]]
  def uploadExam(ce: CollaborativeExam, content: Exam, sender: User): Future[Result]
  def uploadExam(
      ce: CollaborativeExam,
      content: Exam,
      sender: User,
      resultModel: Model,
      pp: PathProperties
  ): Future[Result]
  def uploadAssessment(ce: CollaborativeExam, ref: String, payload: JsValue): Future[Option[String]]
  def deleteExam(ce: CollaborativeExam): Future[Result]
  def createAssessment(participation: ExamParticipation): Future[Boolean]
  def createAssessmentWithAttachments(participation: ExamParticipation): Future[Boolean]
  def getAssessmentPath(): PathProperties

