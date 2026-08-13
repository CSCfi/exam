// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.enrolment

import com.google.inject.ImplementedBy
import models.exam.Exam
import models.user.User

@ImplementedBy(classOf[EnrolmentHandlerImpl])
trait EnrolmentHandler:
  def isAllowedToParticipate(exam: Exam, user: User): Boolean
