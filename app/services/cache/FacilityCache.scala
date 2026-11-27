// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.cache

trait FacilityCache:
  def storeFacilityPassword(facilityId: String, password: String): Unit
  def getFacilityPassword(facilityId: String): Option[String]
