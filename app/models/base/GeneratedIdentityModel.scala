// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.base

import jakarta.persistence.*

@MappedSuperclass
abstract class GeneratedIdentityModel extends VersionedModel:
  @Id
  @GeneratedValue(strategy = GenerationType.SEQUENCE)
  var id: java.lang.Long = 0
