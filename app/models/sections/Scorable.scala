// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

trait Scorable:
  def getAssessedScore: Double
  def getMaxAssessedScore: Double
  def isRejected: Boolean
  def isApproved: Boolean
