// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.base

import jakarta.persistence.*
import models.user.User
import services.datetime.JsonInstant

import java.time.Instant
import scala.compiletime.uninitialized

@MappedSuperclass
class OwnedModel extends GeneratedIdentityModel:
  @JsonInstant
  var created: Instant = uninitialized

  @ManyToOne
  @JoinColumn(name = "creator_id")
  var creator: User = uninitialized

  @JsonInstant
  var modified: Instant = uninitialized

  @ManyToOne
  @JoinColumn(name = "modifier_id")
  var modifier: User = uninitialized

  def setCreatorWithDate(user: User): Unit =
    creator = user
    created = Instant.now()

  def setModifierWithDate(user: User): Unit =
    modifier = user
    modified = Instant.now()
