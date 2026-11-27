// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.facility.services

sealed trait AccessibilityError:
  def message: String

object AccessibilityError:
  case object NotFound extends AccessibilityError:
    override val message: String = "accessibility not found"
