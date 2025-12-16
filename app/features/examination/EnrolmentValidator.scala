// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination

import features.examination.services.RequestData
import models.enrolment.ExamEnrolment
import play.api.Mode
import play.api.mvc.Results.Forbidden
import play.api.mvc.Result

import scala.concurrent.Future

trait EnrolmentValidator:

  protected def environment: play.api.Environment

  /** Validates basic enrolment requirements (null checks, reservation, machine, IP address)
    *
    * @param enrolment
    *   the enrolment to validate
    * @param requestData
    *   the request data (remote address, etc.)
    * @param skipIpCheck
    *   if true, skips IP address validation (useful for external exams without detailed room info)
    * @return
    *   Some(Result) if validation fails, None if validation passes
    */
  protected def validateBasicEnrolment(
      enrolment: ExamEnrolment,
      requestData: RequestData,
      skipIpCheck: Boolean = false
  ): Future[Option[Result]] =
    if Option(enrolment).isEmpty then Future.successful(Some(Forbidden("i18n_reservation_not_found")))
    else if Option(enrolment.getReservation).isEmpty then
      Future.successful(Some(Forbidden("i18n_reservation_not_found")))
    else if Option(enrolment.getReservation.getMachine).isEmpty then
      Future.successful(Some(Forbidden("i18n_reservation_machine_not_found")))
    else if !skipIpCheck && environment.mode != Mode.Dev &&
      !enrolment.getReservation.getMachine.getIpAddress.equals(requestData.remoteAddress)
    then Future.successful(Some(Forbidden("i18n_wrong_exam_machine")))
    else Future.successful(None)
