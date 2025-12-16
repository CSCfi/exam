// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security

import models.user.{Permission, Role}
import play.api.mvc._

import scala.concurrent.{ExecutionContext, Future}

/** Permission-only filter (equivalent to @Pattern annotation)
  *
  * Uses permissions stored in the session for efficient checking without database queries.
  */
object PermissionFilter:

  /** Create an ActionFilter that checks for a permission pattern
    *
    * @param permission
    *   the permission type to check (e.g., Permission.Type.EXAM_PARTICIPATION)
    * @param ec
    *   execution context
    * @return
    *   an ActionFilter that can be used with andThen
    */
  def apply(permission: Permission.Type)(implicit ec: ExecutionContext): ActionFilter[Request] =
    new ActionFilter[Request] {
      override def executionContext: ExecutionContext = ec

      override def filter[A](input: Request[A]): Future[Option[Result]] = Future.successful {
        // Check permissions from the session (stored by AuthenticatedAction)
        input.attrs.get(Auth.ATTR_PERMISSIONS) match
          case Some(permissions) if permissions.contains(permission.toString) =>
            None // User has permission, allow access
          case Some(_) =>
            Some(Results.Forbidden("Insufficient permissions"))
          case None =>
            Some(Results.Unauthorized("Authentication required"))
      }
    }

object CombinedRoleAndPermissionFilter:

  /** Create an ActionFilter that checks both permission pattern and role
    *
    * Uses permissions from session and user's login role for efficient checking.
    *
    * @param permission
    *   the permission type to check
    * @param role
    *   the role to check
    * @param anyMatch
    *   if true, allows access if EITHER permission OR role matches; if false, requires BOTH
    * @param ec
    *   execution context
    * @return
    *   an ActionFilter that can be used with andThen
    */
  def apply(permission: Permission.Type, role: Role.Name, anyMatch: Boolean = false)(implicit
      ec: ExecutionContext
  ): ActionFilter[Request] =
    new ActionFilter[Request] {
      override def executionContext: ExecutionContext = ec

      override def filter[A](input: Request[A]): Future[Option[Result]] = Future.successful {
        (input.attrs.get(Auth.ATTR_USER), input.attrs.get(Auth.ATTR_PERMISSIONS)) match
          case (Some(user), Some(permissions)) =>
            val hasPermissionMatch = permissions.contains(permission.toString)
            val hasRoleMatch       = user.getLoginRole == role

            val allowed =
              if anyMatch then hasPermissionMatch || hasRoleMatch
              else hasPermissionMatch && hasRoleMatch

            if allowed then None
            else Some(Results.Forbidden("Insufficient permissions"))

          case _ => Some(Results.Unauthorized("Authentication required"))
      }
    }

  /** Create an ActionFilter that checks permission pattern OR role (convenience method)
    *
    * @param permission
    *   the permission type to check
    * @param role
    *   the role to check
    * @param ec
    *   execution context
    * @return
    *   an ActionFilter that allows access if EITHER permission OR role matches
    */
  def anyMatch(permission: Permission.Type, role: Role.Name)(implicit ec: ExecutionContext): ActionFilter[Request] =
    apply(permission, role, anyMatch = true)

  /** Create an ActionFilter that checks permission pattern AND role (convenience method)
    *
    * @param permission
    *   the permission type to check
    * @param role
    *   the role to check
    * @param ec
    *   execution context
    * @return
    *   an ActionFilter that requires BOTH the permission AND role to match
    */
  def allMatch(permission: Permission.Type, role: Role.Name)(implicit ec: ExecutionContext): ActionFilter[Request] =
    apply(permission, role)
