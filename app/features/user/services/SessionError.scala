// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

sealed trait SessionError:
  def message: String

object SessionError:
  case object NoCredentials extends SessionError:
    val message = "No credentials!"
  case object LoginTypeNotSupported extends SessionError:
    val message = "login type not supported"
  case object DisallowedLogin extends SessionError:
    val message = "i18n_error_disallowed_login_with_external_domain_credentials"
  case object Unauthenticated extends SessionError:
    val message = "i18n_error_unauthenticated"
  case object LoginFailed extends SessionError:
    val message = "Login failed"
  case object FailedToHandleExternalReservation extends SessionError:
    val message = "Failed to handle external reservation"
  case object NoSession extends SessionError:
    val message = "No session"
  case object InvalidUserId extends SessionError:
    val message = "Invalid user ID"
  case object UserNotFound extends SessionError:
    val message = "User not found"
  case object RoleNotFound extends SessionError:
    val message = "Role not found"
  case object UserDoesNotHaveRole extends SessionError:
    val message = "User does not have this role"
  case class ValidationError(message: String) extends SessionError
