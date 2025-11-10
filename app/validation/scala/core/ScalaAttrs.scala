// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

import play.api.libs.typedmap.TypedKey
import validation.scala.calendar.{ReservationDTO, ExternalReservationDTO}
import validation.scala.section.SectionQuestionDTO
import models.exam.Exam

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
  
  // Enrolment validation
  val COURSE_CODE: TypedKey[String]            = TypedKey[String]("code")
  val ENROLMENT_INFORMATION: TypedKey[String]  = TypedKey[String]("enrolmentInformation")
  val USER_ID: TypedKey[Long]                  = TypedKey[Long]("userId")
  val EMAIL: TypedKey[String]                  = TypedKey[String]("email")
  
  // Examination event validation
  val DATE: TypedKey[org.joda.time.LocalDate] = TypedKey[org.joda.time.LocalDate]("date")
  val EXAMINATION_EVENT: TypedKey[validation.scala.exam.ExaminationEventDTO] = 
    TypedKey[validation.scala.exam.ExaminationEventDTO]("examinationEvent")
  
  // Exam validation
  val EXAM: TypedKey[Exam] = TypedKey[Exam]("exam")
  
  // Section question validation
  val SECTION_QUESTION: TypedKey[SectionQuestionDTO] = TypedKey[SectionQuestionDTO]("sectionQuestion")
  
  // User validation
  val LANG: TypedKey[String] = TypedKey[String]("lang")
