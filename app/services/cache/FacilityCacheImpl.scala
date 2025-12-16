// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.cache

import play.api.cache.SyncCacheApi

import javax.inject.Inject
import scala.concurrent.duration._

class FacilityCacheImpl @Inject() (cache: SyncCacheApi) extends FacilityCache:

  private val FACILITY_KEY_PREFIX = "external_facility_password:"
  private val DEFAULT_TTL         = 30.minutes

  override def storeFacilityPassword(facilityId: String, password: String): Unit =
    cache.set(FACILITY_KEY_PREFIX + facilityId, password, DEFAULT_TTL)

  override def getFacilityPassword(facilityId: String): Option[String] =
    cache.get(FACILITY_KEY_PREFIX + facilityId)
