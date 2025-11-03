// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import play.api.libs.typedmap.TypedKey

/** Scala-friendly typed keys for request attributes
  */
object ScalaAttrs:
  val ID_LIST: TypedKey[List[Long]]       = TypedKey[List[Long]]("idList")
  val STRING_LIST: TypedKey[List[String]] = TypedKey[List[String]]("stringList")

  // Comment validation
  val COMMENT: TypedKey[String]          = TypedKey[String]("comment")
  val COMMENT_ID: TypedKey[Long]         = TypedKey[Long]("commentId")
  val FEEDBACK_STATUS: TypedKey[Boolean] = TypedKey[Boolean]("feedbackStatus")
