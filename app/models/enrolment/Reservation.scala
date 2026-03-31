// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import com.fasterxml.jackson.annotation.JsonBackReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.facility.ExamMachine
import models.user.User
import services.datetime.Interval
import services.datetime.IntervalExtensions.*
import services.datetime.JsonInstant

import java.time.Instant
import scala.compiletime.uninitialized

@Entity
class Reservation extends GeneratedIdentityModel with Ordered[Reservation]:
  @OneToOne(mappedBy = "reservation")
  @JsonBackReference
  var enrolment: ExamEnrolment = uninitialized

  @ManyToOne
  @JoinColumn(name = "machine_id")
  @JsonBackReference
  var machine: ExamMachine = uninitialized

  @ManyToOne
  @JoinColumn(name = "user_id")
  @JsonBackReference
  var user: User = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  var externalReservation: ExternalReservation = uninitialized

  @JsonInstant var startAt: Instant = uninitialized
  @JsonInstant var endAt: Instant   = uninitialized

  var reminderSent: Boolean   = false
  var sentAsNoShow: Boolean   = false
  var externalRef: String     = uninitialized
  var externalUserRef: String = uninitialized
  var externalOrgRef: String  = uninitialized
  var externalOrgName: String = uninitialized

  def toInterval: Interval = startAt to endAt

  override def compare(o: Reservation): Int = startAt.compareTo(o.startAt)

  override def equals(o: Any): Boolean = o match
    case r: Reservation => this.id == r.id
    case _              => false

  override def hashCode: Int = id.toInt
