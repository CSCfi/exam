// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.examination.services

sealed trait TimeError

object TimeError:
  case object EnrolmentNotFound extends TimeError
