// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.question.services

sealed trait ExamMaterialError:
  def message: String

object ExamMaterialError:
  case object MaterialNotFound extends ExamMaterialError:
    override val message: String = "Material not found"
  case object SectionNotFound extends ExamMaterialError:
    override val message: String = "Section not found"
  case object NotAuthorized extends ExamMaterialError:
    override val message: String = "Not authorized"
