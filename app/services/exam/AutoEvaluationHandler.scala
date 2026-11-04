// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import com.google.inject.ImplementedBy
import models.exam.Exam

@ImplementedBy(classOf[AutoEvaluationHandlerImpl])
trait AutoEvaluationHandler:
  /** Grades the exam per its auto-evaluation config, if it has one. Left carries the reason it
    * could not be graded; the exam then stays in REVIEW for the teacher to grade by hand.
    */
  def autoEvaluate(exam: Exam): Either[String, Unit]
