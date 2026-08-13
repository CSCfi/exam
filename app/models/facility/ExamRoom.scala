// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import com.fasterxml.jackson.annotation.JsonManagedReference
import io.ebean.Finder
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}

import scala.compiletime.uninitialized

@Entity
class ExamRoom extends GeneratedIdentityModel with RoomLike:
  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "room", fetch = FetchType.EAGER)
  var defaultWorkingHours: java.util.Set[DefaultWorkingHours] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "room")
  @JsonManagedReference
  var calendarExceptionEvents: java.util.Set[ExceptionWorkingHours] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "room")
  var examStartingHours: java.util.Set[ExamStartingHour] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "room")
  @JsonManagedReference
  var examMachines: java.util.List[ExamMachine] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL), mappedBy = "examRoom")
  @JsonManagedReference
  var accessibilities: java.util.List[Accessibility] = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  var mailAddress: MailAddress = uninitialized

  var name: String               = uninitialized
  var roomCode: String           = uninitialized
  var buildingName: String       = uninitialized
  var campus: String             = uninitialized
  var externalRef: String        = uninitialized
  var accessible: Boolean        = false
  var roomInstruction: String    = uninitialized
  var roomInstructionEN: String  = uninitialized
  var roomInstructionSV: String  = uninitialized
  var contactPerson: String      = uninitialized
  var videoRecordingsURL: String = uninitialized
  var statusComment: String      = uninitialized
  var outOfService: Boolean      = false
  var state: String              = uninitialized
  var localTimezone: String      = uninitialized
  var internalPassword: String   = uninitialized
  var externalPassword: String   = uninitialized

  @Transient var internalPasswordRequired: Boolean = false
  @Transient var externalPasswordRequired: Boolean = false

  override def equals(o: Any): Boolean = o match
    case r: ExamRoom => this.id == r.id
    case _           => false

  override def hashCode: Int = id.toInt

object ExamRoom:
  enum State:
    case ACTIVE, INACTIVE

  val find: Finder[Long, ExamRoom] = new Finder[Long, ExamRoom](classOf[ExamRoom])
