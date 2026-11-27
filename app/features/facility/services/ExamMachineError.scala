// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

sealed trait ExamMachineError:
  def message: String

object ExamMachineError:
  case object MachineNotFound extends ExamMachineError:
    override val message: String = "machine not found"
  case object RoomNotFound extends ExamMachineError:
    override val message: String = "room not found"
  case object SoftwareNotFound extends ExamMachineError:
    override val message: String = "software not found"
  case class IpAddressConflict(message: String)    extends ExamMachineError
  case class SoftwareNameConflict(message: String) extends ExamMachineError
