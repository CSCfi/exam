// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.base.scala

import io.ebean.text.PathProperties
import io.ebean.{DB, Model}
import miscellaneous.scala.JavaApiHelper
import models.user.Role
import play.api.libs.json.{JsValue, Json}
import play.api.libs.typedmap.TypedKey
import play.api.mvc.{BaseController, Request, Result}
import security.scala.Auth
import system.interceptors.AnonymousJsonAction

trait ExamBaseController extends JavaApiHelper:
  self: BaseController =>

  protected def writeAnonymousResult(
      request: Request[?],
      result: Result,
      anonymous: Boolean,
      admin: Boolean
  ): Result =
    if (anonymous && !admin) {
      withAnonymousHeader(result, request, Set.empty[Long])
    } else {
      result
    }

  protected def writeAnonymousResult(
      request: Request[?],
      result: Result,
      anonymous: Boolean
  ): Result =
    val user = request.attrs(Auth.ATTR_USER)
    writeAnonymousResult(request, result, anonymous, user.hasRole(Role.Name.ADMIN))

  protected def writeAnonymousResult(
      request: Request[?],
      result: Result,
      anonIds: Set[Long]
  ): Result =
    val user = request.attrs(Auth.ATTR_USER)
    if anonIds.nonEmpty && !user.hasRole(Role.Name.ADMIN) then withAnonymousHeader(result, request, anonIds)
    else result

  private def withAnonymousHeader(
      result: Result,
      request: Request[?],
      anonIds: Set[Long]
  ): Result =
    // Note: In Scala Play, we can't modify request attributes after creation
    // The AnonymousJsonAction (Java) or AnonymousJsonFilter (Scala) must check
    // for IDs stored in attributes before this method is called
    // This method signature matches Java for compatibility but has limitations
    val tk = TypedKey[Set[Long]](AnonymousJsonAction.CONTEXT_KEY)
    // Store in a way that can be accessed by the filter
    result.withHeaders(AnonymousJsonAction.ANONYMOUS_HEADER -> true.toString)

  protected def serialize(obj: Any): JsValue = obj match
    case model: Model => model.asJson
    case iter: Iterable[?] if iter.headOption.exists(_.isInstanceOf[Model]) =>
      iter.asInstanceOf[Iterable[Model]].asJson
    case other =>
      val jsonString = DB.json().toJson(other)
      Json.parse(jsonString)

  protected def serialize(obj: Any, props: PathProperties): JsValue =
    val jsonString = DB.json().toJson(obj, props)
    Json.parse(jsonString)

  protected def ok(obj: Any, props: PathProperties): Result =
    val jsonString = DB.json().toJson(obj, props)
    Ok(jsonString).as("application/json")

  protected def created(obj: Any, props: PathProperties): Result =
    val jsonString = DB.json().toJson(obj, props)
    Created(jsonString).as("application/json")
