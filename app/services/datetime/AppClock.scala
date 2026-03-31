// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import java.time.Instant

trait AppClock:
  def now(): Instant

class SystemAppClock extends AppClock:
  def now(): Instant = Instant.now()

class FixedAppClock(fixedTime: Instant) extends AppClock:
  def now(): Instant = fixedTime
