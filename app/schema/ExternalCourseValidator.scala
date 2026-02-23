// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package schema

import play.api.libs.functional.syntax._
import play.api.libs.json.Reads._
import play.api.libs.json._

object ExternalCourseValidator:
  private val asInt: Reads[Int]       = implicitly[Reads[String]].map(_.toInt)
  private val asString: Reads[String] = implicitly[Reads[Int]].map(_.toString)
  private val readInt: Reads[String]  = implicitly[Reads[String]].orElse(asString)
  private val readString: Reads[Int]  = implicitly[Reads[Int]].orElse(asInt)

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
  case class GradeScale(
      name: Option[String],
      `type`: String,
      code: Option[String],
      grades: Option[Map[String, Grade]]
  )

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
    implicit val lecturerResponsibleReads: Reads[LecturerResponsible] =
      Json.reads[LecturerResponsible]
  case class LecturerResponsible(name: String)

  object Lecturer:
    implicit val lecturerReads: Reads[Lecturer] = Json.reads[Lecturer]
  case class Lecturer(name: String)

  object CreditLanguage:
    implicit val creditLanguageReads: Reads[CreditLanguage] = Json.reads[CreditLanguage]
  case class CreditLanguage(name: String)

  object CourseUnitInfo:
    private def readNameFieldSeq[A](fromName: String => A)(using r: Reads[A]): Reads[Seq[A]] =
      implicitly[Reads[String]].map(s => Seq(fromName(s)))
        .orElse(r.map(Seq(_)))
        .orElse(implicitly[Reads[Seq[A]]])
    private val asScales: Reads[Seq[GradeScale]] = implicitly[Reads[GradeScale]].map(Seq(_))
    private val readScale: Reads[Seq[GradeScale]] =
      implicitly[Reads[Seq[GradeScale]]].orElse(asScales)
    private val readCreditsLanguage: Reads[Seq[CreditLanguage]] =
      readNameFieldSeq(CreditLanguage.apply)
    private val readCampus: Reads[Seq[Campus]] = readNameFieldSeq(Campus.apply)
    private val readDegreeProgramme: Reads[Seq[DegreeProgramme]] =
      readNameFieldSeq(DegreeProgramme.apply)
    private val readDepartment: Reads[Seq[Department]] = readNameFieldSeq(Department.apply)
    private val readLecturerResponsible: Reads[Seq[LecturerResponsible]] =
      readNameFieldSeq(LecturerResponsible.apply)
    private val readLecturer: Reads[Seq[Lecturer]] = readNameFieldSeq(Lecturer.apply)
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
        (JsPath \ "campus").readNullable[Seq[Campus]](using readCampus) and
        (JsPath \ "degreeProgramme").readNullable[Seq[DegreeProgramme]](using
          readDegreeProgramme
        ) and
        (JsPath \ "department").readNullable[Seq[Department]](using readDepartment) and
        (JsPath \ "lecturerResponsible").readNullable[Seq[LecturerResponsible]](using
        readLecturerResponsible) and
        (JsPath \ "lecturer").readNullable[Seq[Lecturer]](using readLecturer) and
        (JsPath \ "creditsLanguage").readNullable[Seq[CreditLanguage]](using
          readCreditsLanguage
        ) and
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
