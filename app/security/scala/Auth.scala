// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security.scala

import io.ebean.DB
import models.user.{Role, User}
import play.api.libs.typedmap.TypedKey
import play.api.mvc.Results._
import play.api.mvc._

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.util.Try

// TODO: Support for permissions
object Auth:
  val ATTR_USER: TypedKey[User] = TypedKey[User]("authenticatedUser")
  case class AuthenticatedAction @Inject() (override val parser: BodyParsers.Default)(implicit
      ec: AuthExecutionContext
  ) extends ActionBuilderImpl(parser):
    override def invokeBlock[A](
        request: Request[A],
        block: Request[A] => Future[Result]
    ): Future[Result] =
      val failure =
        Future.successful(Unauthorized(s"Blocked unauthorized access to ${request.path}"))
      val attrs = request.session.data
      if attrs.contains("id") && attrs.contains("role") then
        Future {
          Option(DB.find(classOf[User], attrs("id").toLong))
        }(using executionContext).flatMap {
          case Some(user) =>
            user.setLoginRole(Role.Name.valueOf(request.session("role")))
            block(request.addAttr(ATTR_USER, user))
          case None => failure
        }(using executionContext)
      else failure

  def authorized(roles: Seq[Role.Name])(implicit ec: ExecutionContext): ActionFilter[Request] =
    new ActionFilter[Request] {
      override def executionContext: ExecutionContext = ec

      override def filter[A](input: Request[A]): Future[Option[Result]] = Future.successful {
        // Try to use already-loaded user first (when used with authenticated)
        input.attrs.get(ATTR_USER) match
          case Some(user) if roles.contains(user.getLoginRole) =>
            None
          case Some(_) =>
            Some(Forbidden("Insufficient permissions"))
          case None =>
            // Fallback: check session directly (when used standalone)
            input.session.get("role").flatMap(r => Try(Role.Name.valueOf(r)).toOption) match
              case Some(role) if roles.contains(role) => None
              case _ => Some(Unauthorized("Authentication required"))
      }
    }
