// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.enrolment

import models.exam.Exam
import models.user.User

trait EnrolmentHandler:
  def isAllowedToParticipate(exam: Exam, user: User): Boolean

