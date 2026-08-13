// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

sealed trait TagError:
  def message: String

object TagError:
  case object TagNotFound extends TagError:
    override val message: String = "Tag not found"
