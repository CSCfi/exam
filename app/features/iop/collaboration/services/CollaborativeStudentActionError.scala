// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

sealed trait CollaborativeStudentActionError:
  def message: String

object CollaborativeStudentActionError:
  case object InvalidUrl extends CollaborativeStudentActionError:
    val message = "Invalid URL"
  case class ConnectionError(message: String) extends CollaborativeStudentActionError
