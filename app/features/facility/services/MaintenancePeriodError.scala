// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

sealed trait MaintenancePeriodError:
  def message: String

object MaintenancePeriodError:
  case object NotFound extends MaintenancePeriodError:
    override val message: String = "maintenance period not found"
  case object BadPayload extends MaintenancePeriodError:
    override val message: String = "Bad payload"
