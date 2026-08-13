// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import jakarta.persistence.{Column, Entity, ManyToOne}
import models.base.OwnedModel
import models.exam.Exam

import scala.compiletime.uninitialized

@Entity
class InspectionComment extends OwnedModel:
  @Column(columnDefinition = "TEXT")
  var comment: String = uninitialized

  @ManyToOne
  var exam: Exam = uninitialized
