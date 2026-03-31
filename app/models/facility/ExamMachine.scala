// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.enrolment.Reservation
import models.exam.Exam
import services.datetime.Interval

import scala.compiletime.uninitialized

@Entity
class ExamMachine extends GeneratedIdentityModel:
  @ManyToMany(cascade = Array(CascadeType.ALL))
  var softwareInfo: java.util.List[Software] = uninitialized

  @ManyToOne
  @JsonBackReference
  var room: ExamRoom = uninitialized

  @OneToMany(cascade = Array(CascadeType.PERSIST), mappedBy = "machine")
  @JsonManagedReference
  var reservations: java.util.List[Reservation] = uninitialized

  var name: String               = uninitialized
  var otherIdentifier: String    = uninitialized
  var ipAddress: String          = uninitialized
  var surveillanceCamera: String = uninitialized
  var videoRecordings: String    = uninitialized
  var expanded: Boolean          = false
  var statusComment: String      = uninitialized
  var archived: Boolean          = false
  var outOfService: Boolean      = false

  def hasRequiredSoftware(exam: Exam): Boolean =
    import scala.jdk.CollectionConverters.*
    exam.softwares.asScala.toSet.subsetOf(softwareInfo.asScala.toSet)

  def isReservedDuring(interval: Interval): Boolean =
    import scala.jdk.CollectionConverters.*
    reservations.asScala.exists(r => interval.overlaps(r.toInterval))

  override def toString: String = s"ExamMachine{ id=$id, name=$name }"
