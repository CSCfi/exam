// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

enum LtiError(val message: String):
  case MissingLaunchTarget     extends LtiError("Missing sectionQuestionId or examHash")
  case LaunchNotFound          extends LtiError("No LTI question found for this launch")
  case IncompleteConfiguration extends LtiError("Missing required LTI setting lti.platform.issuer")
  case ToolNotConfigured       extends LtiError("The LTI tool of this question is not configured")
  case MissingToolParameters
      extends LtiError("The question is missing parameters its LTI tool requires")
  case InvalidClientId    extends LtiError("Invalid client_id")
  case MissingParameters  extends LtiError("Missing required parameters")
  case NoLaunchInSession  extends LtiError("Missing launch target in session")
  case InvalidRedirectUri extends LtiError("redirect_uri is not registered for this client")
  case LoginHintMismatch
      extends LtiError("login_hint does not match the session that started this login")
  case KeyUnavailable          extends LtiError("LTI signing key could not be read")
  case DeepLinkingNotSupported extends LtiError("The LTI tool does not support deep linking")
  case DeepLinkNotFound        extends LtiError("No such deep linking request")
  case DeepLinkTooManyPicks    extends LtiError("More than one resource was picked")
  case ToolKeysUnavailable     extends LtiError("The LTI tool's keys could not be fetched")
  case InvalidDeepLinkResponse(reason: String)
      extends LtiError(s"Invalid deep linking response: $reason")
  case CspNonceUnavailable
      extends LtiError("No CSP nonce for the launch script; check play.filters.csp.nonce")
