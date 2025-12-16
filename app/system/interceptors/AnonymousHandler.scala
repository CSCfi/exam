// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system.interceptors

import models.user.Role
import play.api.libs.typedmap.TypedKey
import play.api.mvc.{Request, Result}
import security.Auth

trait AnonymousHandler:

  protected def writeAnonymousResult(
      request: Request[?],
      result: Result,
      anonymous: Boolean,
      admin: Boolean
  ): Result =
    if anonymous && !admin then withAnonymousHeader(result)
    else result

  protected def writeAnonymousResult(
      request: Request[?],
      result: Result,
      anonymous: Boolean
  ): Result =
    val user = request.attrs(Auth.ATTR_USER)
    writeAnonymousResult(request, result, anonymous, user.hasRole(Role.Name.ADMIN))

  /** Writes an anonymous result with ID-based filtering.
    *
    * Stores anonymous IDs in the Result attributes and adds a header to signal filtering. The AnonymousJsonFilter will
    * read these IDs and filter the response accordingly.
    *
    * @param request
    *   the current request
    * @param result
    *   the result to mark as anonymous
    * @param anonIds
    *   entity IDs that should have properties filtered
    * @return
    *   result with IDs stored in attributes and anonymous header
    */
  protected def withAnonymousResult(
      request: Request[?],
      result: Result,
      anonIds: Set[Long]
  ): Result =
    val user = request.attrs(Auth.ATTR_USER)
    if anonIds.isEmpty || user.hasRole(Role.Name.ADMIN) then result
    else withAnonymousHeader(result.addAttr(AnonymousHandler.ANON_IDS_KEY, anonIds))

  private def withAnonymousHeader(result: Result): Result =
    result.withHeaders(AnonymousJsonFilter.ANONYMOUS_HEADER -> true.toString)

object AnonymousHandler:
  val ANON_IDS_KEY: TypedKey[Set[Long]] = TypedKey(AnonymousJsonFilter.DEFAULT_CONTEXT_KEY)
