// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar

import jakarta.persistence.{Entity, Temporal, TemporalType}
import models.base.GeneratedIdentityModel
import org.joda.time.DateTime
import services.datetime.JsonDateTime

import scala.compiletime.uninitialized

@Entity
class MaintenancePeriod extends GeneratedIdentityModel:
  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var startsAt: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var endsAt: DateTime = uninitialized

  var description: String = uninitialized
