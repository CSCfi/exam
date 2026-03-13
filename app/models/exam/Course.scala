// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.facility.Organisation

import java.util.Date
import scala.compiletime.uninitialized

@Entity
class Course extends GeneratedIdentityModel:
  @ManyToOne
  var gradeScale: GradeScale = uninitialized

  @OneToMany(mappedBy = "course")
  @JsonBackReference
  var exams: java.util.List[Exam] = uninitialized

  @ManyToOne
  var organisation: Organisation = uninitialized

  var code: String                 = uninitialized
  var name: String                 = uninitialized
  var level: String                = uninitialized
  var credits: java.lang.Double    = uninitialized
  var courseUnitType: String       = uninitialized
  var identifier: String           = uninitialized
  var startDate: Date              = uninitialized
  var endDate: Date                = uninitialized
  var courseImplementation: String = uninitialized
  var creditsLanguage: String      = uninitialized
  var lecturer: String             = uninitialized
  var lecturerResponsible: String  = uninitialized
  var institutionName: String      = uninitialized
  var department: String           = uninitialized
  var degreeProgramme: String      = uninitialized
  var campus: String               = uninitialized
  var courseMaterial: String       = uninitialized

  override def equals(o: Any): Boolean = o match
    case c: Course => this.code == c.code
    case _         => false

  override def hashCode: Int = if code != null then code.hashCode else 0

  override def toString: String =
    s"Course{id=$id, code='$code', name='$name', credits=$credits}"
