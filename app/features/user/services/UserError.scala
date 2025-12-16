// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

sealed trait UserError:
  def message: String

object UserError:
  case object UserNotFound extends UserError:
    val message = "user not found"
  case object PermissionNotFound extends UserError:
    val message = "permission not found"
  case object InvalidPermissionType extends UserError:
    val message = "invalid permission type"
  case object RoleNotFound extends UserError:
    val message = "i18n_role_not_found"
  case object UnsupportedLanguage extends UserError:
    val message = "Unsupported language code"
