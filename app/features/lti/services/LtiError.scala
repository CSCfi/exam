// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

enum LtiError(val message: String):
  case MissingResourceId extends LtiError("Missing resourceId")
  case IncompleteConfiguration
      extends LtiError(
        "Missing required LTI settings (tool initiate url, issuer, target link uri, client id)."
      )
  case InvalidClientId       extends LtiError("Invalid client_id")
  case MissingParameters     extends LtiError("Missing required parameters")
  case NoResourceIdInSession extends LtiError("Missing resourceId in session")
  case KeyUnavailable        extends LtiError("LTI signing key could not be read")
