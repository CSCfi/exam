// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.base

import jakarta.persistence.*
import models.user.User
import org.joda.time.DateTime
import services.datetime.JsonDateTime

import scala.compiletime.uninitialized

@MappedSuperclass
class OwnedModel extends GeneratedIdentityModel:
  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var created: DateTime = uninitialized

  @ManyToOne
  @JoinColumn(name = "creator_id")
  var creator: User = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var modified: DateTime = uninitialized

  @ManyToOne
  @JoinColumn(name = "modifier_id")
  var modifier: User = uninitialized

  def setCreatorWithDate(user: User): Unit =
    creator = user
    created = DateTime.now()

  def setModifierWithDate(user: User): Unit =
    modifier = user
    modified = DateTime.now()
