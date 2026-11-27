// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

/** Error types for review operations */
sealed trait ReviewError:
  def message: String

object ReviewError:
  case object ExamNotFound extends ReviewError:
    val message = "i18n_exam_not_found"

  case object ParticipationNotFound extends ReviewError:
    val message = "Participation not found"

  case object QuestionNotFound extends ReviewError:
    val message = "Question not found"

  case object CommentNotFound extends ReviewError:
    val message = "Comment not found"

  case object AccessForbidden extends ReviewError:
    val message = "i18n_error_access_forbidden"

  case object ModificationForbidden extends ReviewError:
    val message = "You are not allowed to modify this object"

  case object NoPermissionToScore extends ReviewError:
    val message = "No permission to update scoring of this exam"

  case object NotAllowedToUpdateScoring extends ReviewError:
    val message = "Not allowed to update scoring of this exam"

  case object NotAllowedToUpdateGrading extends ReviewError:
    val message = "Not allowed to update grading of this exam"

  case object InvalidScoreRange extends ReviewError:
    val message = "Invalid score range"

  case object InvalidGradeForScale extends ReviewError:
    val message = "Invalid grade for this grade scale"

  case object Forbidden extends ReviewError:
    val message = "Forbidden"

  case object BadRequest extends ReviewError:
    val message = "BadRequest"
