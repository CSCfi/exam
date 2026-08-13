// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonProperty}
import jakarta.persistence.{Entity, OneToOne}
import models.base.GeneratedIdentityModel
import models.exam.Exam
import models.user.User

import scala.compiletime.uninitialized

@Entity
class ExamScore extends GeneratedIdentityModel:
  @OneToOne(mappedBy = "examScore")
  @JsonBackReference
  var examRecord: ExamRecord = uninitialized

  @JsonProperty("date")
  def getRegistrationDate: String = registrationDate

  var studentId: String              = uninitialized
  var student: String                = uninitialized
  var identifier: String             = uninitialized
  var courseUnitCode: String         = uninitialized
  var examDate: String               = uninitialized
  var credits: String                = uninitialized
  var creditLanguage: String         = uninitialized
  var studentGrade: String           = uninitialized
  var gradeScale: String             = uninitialized
  var examScore: String              = uninitialized
  var courseUnitLevel: String        = uninitialized
  var courseUnitType: String         = uninitialized
  var creditType: String             = uninitialized
  var lecturer: String               = uninitialized
  var lecturerId: String             = uninitialized
  var lecturerEmployeeNumber: String = uninitialized
  var lecturerFirstName: String      = uninitialized
  var lecturerLastName: String       = uninitialized
  var registrationDate: String       = uninitialized
  var courseImplementation: String   = uninitialized
  var additionalInfo: String         = uninitialized
  var institutionName: String        = uninitialized

  def asCells(
      studentUser: User,
      teacherUser: User,
      exam: Exam
  ): List[(String, ExamScore.CellType)] =
    import ExamScore.CellType.*
    List(
      id.toString            -> STRING,
      student                -> STRING,
      studentUser.firstName  -> STRING,
      studentUser.lastName   -> STRING,
      studentUser.email      -> STRING,
      studentId              -> STRING,
      identifier             -> STRING,
      courseUnitCode         -> STRING,
      exam.course.name       -> STRING,
      courseImplementation   -> STRING,
      courseUnitLevel        -> STRING,
      institutionName        -> STRING,
      examDate               -> STRING,
      creditType             -> STRING,
      credits                -> DECIMAL,
      creditLanguage         -> STRING,
      studentGrade           -> STRING,
      gradeScale             -> STRING,
      examScore              -> DECIMAL,
      lecturer               -> STRING,
      teacherUser.firstName  -> STRING,
      teacherUser.lastName   -> STRING,
      lecturerId             -> STRING,
      lecturerEmployeeNumber -> STRING,
      registrationDate       -> STRING,
      additionalInfo         -> STRING
    )

  def asArray(studentUser: User, teacherUser: User, exam: Exam): Array[String] =
    asCells(studentUser, teacherUser, exam).map(_._1).toArray

object ExamScore:
  enum CellType:
    case DECIMAL, STRING

  def getHeaders: Array[String] = Array(
    "id",
    "student",
    "studentFirstName",
    "studentLastName",
    "studentEmail",
    "studentId",
    "identifier",
    "courseUnitCode",
    "courseUnitName",
    "courseImplementation",
    "courseUnitLevel",
    "institutionName",
    "examDate",
    "creditType",
    "credits",
    "creditLanguage",
    "studentGrade",
    "gradeScale",
    "examScore",
    "lecturer",
    "lecturerFirstName",
    "lecturerLastName",
    "lecturerId",
    "lecturerEmployeeNumber",
    "date",
    "additionalInfo"
  )
