// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import com.google.inject.ImplementedBy
import models.enrolment.{ExamEnrolment, Reservation}

@ImplementedBy(classOf[NoShowHandlerImpl])
trait NoShowHandler {
  def handleNoShows(noShows: List[ExamEnrolment], reservations: List[Reservation]): Unit
  def handleNoShowAndNotify(enrolment: ExamEnrolment): Unit
}
