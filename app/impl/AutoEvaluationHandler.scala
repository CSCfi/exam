// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.google.inject.ImplementedBy
import models.Exam

@ImplementedBy(classOf[AutoEvaluationHandlerImpl])
trait AutoEvaluationHandler:
  def autoEvaluate(exam: Exam): Unit
