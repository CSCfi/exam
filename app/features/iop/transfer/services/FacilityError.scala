// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

sealed trait FacilityError:
  def message: String

object FacilityError:
  case class BadRequest(message: String)          extends FacilityError
  case class InternalServerError(message: String) extends FacilityError
