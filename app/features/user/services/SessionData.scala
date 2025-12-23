// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user.services

import play.api.libs.json.JsValue

/** Session data as a map of key-value pairs */
type SessionData = Map[String, String]

/** Login response containing user data and session data */
case class LoginResponse(userData: JsValue, sessionData: SessionData)

/** Check session status */
enum CheckSessionStatus:
  case NoSession
  case Alarm
  case Valid

/** Logout response containing optional logout URL */
case class LogoutResponse(logoutUrl: Option[String])
