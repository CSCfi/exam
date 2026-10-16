// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.calendar

import jakarta.persistence.Entity
import models.base.GeneratedIdentityModel
import services.datetime.JsonInstant

import java.time.Instant
import scala.compiletime.uninitialized

@Entity
class MaintenancePeriod extends GeneratedIdentityModel:
  @JsonInstant var startsAt: Instant = uninitialized
  @JsonInstant var endsAt: Instant   = uninitialized

  var description: String = uninitialized
