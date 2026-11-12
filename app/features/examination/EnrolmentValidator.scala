// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination

import features.examination.services.RequestData
import models.enrolment.ExamEnrolment
import play.api.Mode

trait EnrolmentValidator:

  protected def environment: play.api.Environment

  /** Left with an i18n key if the enrolment has no reservation or machine, or the request comes
    * from another machine than the reserved one (not checked in dev mode).
    */
  protected def validateBasicEnrolment(
      enrolment: ExamEnrolment,
      requestData: RequestData
  ): Either[String, Unit] =
    for
      reservation <- Option(enrolment.reservation).toRight("i18n_reservation_not_found")
      machine     <- Option(reservation.machine).toRight("i18n_reservation_machine_not_found")
      _ <- Either.cond(
        environment.mode == Mode.Dev || machine.ipAddress == requestData.remoteAddress,
        (),
        "i18n_wrong_exam_machine"
      )
    yield ()
