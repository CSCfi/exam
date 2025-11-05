// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors.scala

import play.api.mvc.{ActionBuilder, AnyContent, BaseController, Request}
import security.scala.Auth.AuthenticatedAction

/** Trait for controllers that need automatic sensitive data filtering on all actions
  *
  * @example
  * {{{
  * class UserController @Inject()(
  *   val authenticated: AuthenticatedAction,
  *   val sensitiveDataFilter: SensitiveDataFilter,
  *   val controllerComponents: ControllerComponents
  * ) extends SecureController {
  *
  *   // Override to specify which fields to filter
  *   override protected val sensitiveFields = Set("password", "ssn", "apiToken")
  *
  *   // All methods automatically filter sensitive fields
  *   def getUser(id: Long): Action[AnyContent] = secureAction { request =>
  *     Ok(user.asJson)  // password, ssn, apiToken automatically removed
  *   }
  *
  *   def listUsers: Action[AnyContent] = secureAction { request =>
  *     Ok(users.asJson)  // password, ssn, apiToken automatically removed
  *   }
  * }
  * }}}
  */
trait SecureController extends BaseController:
  val authenticated: AuthenticatedAction
  val sensitiveDataFilter: SensitiveDataFilter

  /** Sensitive fields to filter from all JSON responses
    *
    * Override this in your controller to specify which fields should be filtered.
    * These fields will be automatically removed from ALL action responses in the controller.
    *
    * @example
    * {{{
    * override protected val sensitiveFields = Set("password", "ssn", "apiToken")
    * }}}
    */
  protected def sensitiveFields: Set[String]

  /** Action builder with authentication and sensitive data filtering
    *
    * Use this instead of `authenticated` to automatically filter sensitive fields:
    * {{{
    * def myAction: Action[AnyContent] = secureAction { request =>
    *   Ok(data.asJson)  // Sensitive fields automatically filtered
    * }
    * }}}
    */
  protected def secureAction: ActionBuilder[Request, AnyContent] =
    authenticated.andThen(sensitiveDataFilter(sensitiveFields))

