// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validators

import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._

object ExternalCourseValidator:
  val asInt: Reads[Int]       = implicitly[Reads[String]].map(_.toInt)
  val asString: Reads[String] = implicitly[Reads[Int]].map(_.toString)
  val readInt: Reads[String]  = implicitly[Reads[String]].orElse(asString)
  val readString: Reads[Int]  = implicitly[Reads[Int]].orElse(asInt)

  object Grade:
    val asBoolean: Reads[Boolean]  = implicitly[Reads[String]].map(_.toBoolean)
    val readString: Reads[Boolean] = implicitly[Reads[Boolean]].orElse(asBoolean)
    implicit val gradeReads: Reads[Grade] = (
      (JsPath \ "grade").read[String](using readInt) and
        (JsPath \ "description").read[String] and
        (JsPath \ "scale").read[Int] and
        (JsPath \ "isFailed").readWithDefault(false)(using readString)
    )(Grade.apply)

  case class Grade(grade: String, description: String, scale: Int, isFailed: Boolean = false)

  object GradeScale:
    implicit val scaleReads: Reads[GradeScale] = (
      (JsPath \ "name").readNullable[String] and
        (JsPath \ "type").read[String] and
        (JsPath \ "code").readNullable[String](using readInt) and
        (JsPath \ "grades").readNullable[Map[String, Grade]]
    )(GradeScale.apply)
  case class GradeScale(name: Option[String], `type`: String, code: Option[String], grades: Option[Map[String, Grade]])

  object Organisation:
    implicit val organisationReads: Reads[Organisation] = Json.reads[Organisation]
  case class Organisation(name: String)

  object Campus:
    implicit val campusReads: Reads[Campus] = Json.reads[Campus]
  case class Campus(name: String)

  object DegreeProgramme:
    implicit val degreeProgrammeReads: Reads[DegreeProgramme] = Json.reads[DegreeProgramme]
  case class DegreeProgramme(name: String)

  object Department:
    implicit val departmentReads: Reads[Department] = Json.reads[Department]
  case class Department(name: String)

  object LecturerResponsible:
    implicit val lecturerResponsibleReads: Reads[LecturerResponsible] = Json.reads[LecturerResponsible]
  case class LecturerResponsible(name: String)

  object Lecturer:
    implicit val lecturerReads: Reads[Lecturer] = Json.reads[Lecturer]
  case class Lecturer(name: String)

  object CreditLanguage:
    implicit val creditLanguageReads: Reads[CreditLanguage] = Json.reads[CreditLanguage]
  case class CreditLanguage(name: String)

  object CourseUnitInfo:
    val asScales: Reads[Seq[GradeScale]]  = implicitly[Reads[GradeScale]].map(Seq(_))
    val readScale: Reads[Seq[GradeScale]] = implicitly[Reads[Seq[GradeScale]]].orElse(asScales)
    implicit val cuiReads: Reads[CourseUnitInfo] = (
      (JsPath \ "identifier").read[String](using readInt) and
        (JsPath \ "courseUnitCode").read[String] and
        (JsPath \ "courseUnitTitle").read[String] and
        (JsPath \ "courseUnitImplementation").readNullable[String] and
        (JsPath \ "courseImplementation").readNullable[String] and
        (JsPath \ "courseUnitLevel").readNullable[String](using readInt) and
        (JsPath \ "courseUnitType").readNullable[String](using readInt) and
        (JsPath \ "institutionName").read[String] and
        (JsPath \ "startDate").readNullable[String](using readInt) and
        (JsPath \ "endDate").readNullable[String](using readInt) and
        (JsPath \ "credits").readNullable[Double] and
        (JsPath \ "organisation").readNullable[Organisation] and
        (JsPath \ "campus").readNullable[Seq[Campus]] and
        (JsPath \ "degreeProgramme").readNullable[Seq[DegreeProgramme]] and
        (JsPath \ "department").readNullable[Seq[Department]] and
        (JsPath \ "lecturerResponsible").readNullable[Seq[LecturerResponsible]] and
        (JsPath \ "lecturer").readNullable[Seq[Lecturer]] and
        (JsPath \ "creditsLanguage").readNullable[Seq[CreditLanguage]] and
        (JsPath \ "gradeScale").readNullable[Seq[GradeScale]](using readScale)
    )(CourseUnitInfo.apply)
  case class CourseUnitInfo(
      identifier: String,
      code: String,
      title: String,
      implementation: Option[String],
      altImplementation: Option[String],
      level: Option[String],
      `type`: Option[String],
      institutionName: String,
      startDate: Option[String],
      endDate: Option[String],
      credits: Option[Double],
      organisation: Option[Organisation],
      campus: Option[Seq[Campus]],
      programme: Option[Seq[DegreeProgramme]],
      department: Option[Seq[Department]],
      responsible: Option[Seq[LecturerResponsible]],
      lecturer: Option[Seq[Lecturer]],
      language: Option[Seq[CreditLanguage]],
      gradeScales: Option[Seq[GradeScale]]
  )
