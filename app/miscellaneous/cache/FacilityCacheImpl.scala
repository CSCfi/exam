// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.cache

import play.api.cache.SyncCacheApi

import javax.inject.Inject
import scala.concurrent.duration.*

class FacilityCacheImpl @Inject()(cache: SyncCacheApi) extends FacilityCache:

  private val FACILITY_KEY_PREFIX = "external_facility_password:"
  private val DEFAULT_TTL = 30.minutes

  override def storeFacilityPassword(facilityId: String, password: String): Unit =
    val key = FACILITY_KEY_PREFIX + facilityId
    cache.set(key, password, DEFAULT_TTL)

  override def getFacilityPassword(facilityId: String): Option[String] =
    val key = FACILITY_KEY_PREFIX + facilityId
    cache.get(key)
