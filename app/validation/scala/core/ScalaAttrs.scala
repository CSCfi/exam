// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import play.api.libs.typedmap.TypedKey
import validation.scala.calendar.{ReservationDTO, ExternalReservationDTO}

/** Scala-friendly typed keys for request attributes
  */
object ScalaAttrs:
  val ID_LIST: TypedKey[List[Long]]       = TypedKey[List[Long]]("idList")
  val STRING_LIST: TypedKey[List[String]] = TypedKey[List[String]]("stringList")

  // Comment validation
  val COMMENT: TypedKey[String]          = TypedKey[String]("comment")
  val COMMENT_ID: TypedKey[Long]         = TypedKey[Long]("commentId")
  val FEEDBACK_STATUS: TypedKey[Boolean] = TypedKey[Boolean]("feedbackStatus")
  
  // Reservation validation
  val ATTR_STUDENT_RESERVATION: TypedKey[ReservationDTO] = TypedKey[ReservationDTO]("studentReservation")
  val ATTR_EXT_RESERVATION: TypedKey[ExternalReservationDTO] = TypedKey[ExternalReservationDTO]("externalReservation")
