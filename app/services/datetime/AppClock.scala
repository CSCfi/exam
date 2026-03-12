// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.datetime

import org.joda.time.DateTime

trait AppClock:
  def now(): DateTime

class SystemAppClock extends AppClock:
  def now(): DateTime = DateTime.now()

class FixedAppClock(fixedTime: DateTime) extends AppClock:
  def now(): DateTime = fixedTime
