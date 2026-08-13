// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import jakarta.persistence.{CascadeType, Entity, OneToOne}
import models.base.GeneratedIdentityModel
import models.facility.{MailAddress, RoomLike}

import scala.compiletime.uninitialized

@Entity
class ExternalReservation extends GeneratedIdentityModel with RoomLike:
  var orgRef: String  = uninitialized
  var orgName: String = uninitialized
  var orgCode: String = uninitialized
  var roomRef: String = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  var mailAddress: MailAddress = uninitialized

  var buildingName: String      = uninitialized
  var campus: String            = uninitialized
  var machineName: String       = uninitialized
  var roomName: String          = uninitialized
  var roomCode: String          = uninitialized
  var roomTz: String            = uninitialized
  var roomInstruction: String   = uninitialized
  var roomInstructionEN: String = uninitialized
  var roomInstructionSV: String = uninitialized
