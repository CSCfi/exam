// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.base

import io.ebean.Model
import jakarta.persistence.{MappedSuperclass, Version}

@MappedSuperclass
abstract class VersionedModel extends Model:
  @Version
  var objectVersion: Long = 0
