// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.google.inject.ImplementedBy
import models.assessment.{AutoEvaluationConfig, ExamFeedbackConfig}
import models.exam.Exam
import models.user.{Role, User}
import play.api.mvc.Result

@ImplementedBy(classOf[ExamUpdaterImpl])
trait ExamUpdater:
  def updateTemporalFieldsAndValidate(exam: Exam, user: User, payload: Exam): Option[Result]
  def updateStateAndValidate(exam: Exam, user: User, payload: Exam): Option[Result]
  def isPermittedToUpdate(exam: Exam, user: User): Boolean
  def isAllowedToUpdate(exam: Exam, user: User): Boolean
  def isAllowedToRemove(exam: Exam): Boolean
  def update(exam: Exam, payload: Exam, loginRole: Role.Name): Unit
  def updateAutoEvaluationConfig(exam: Exam, newConfig: AutoEvaluationConfig): Unit
  def updateLanguage(exam: Exam, code: String, user: User): Option[Result]
  def preparePreview(exam: Exam): Unit
  def updateExamFeedbackConfig(exam: Exam, examFeedbackConfig: ExamFeedbackConfig): Unit
