// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import jakarta.persistence.*
import models.base.OwnedModel
import models.exam.Exam
import models.user.User

import java.util.Date
import scala.compiletime.uninitialized

@Entity
class LanguageInspection extends OwnedModel:
  @OneToOne
  var exam: Exam = uninitialized

  @ManyToOne
  var assignee: User = uninitialized

  @OneToOne
  var statement: Comment = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  var startedAt: Date = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  var finishedAt: Date = uninitialized

  var approved: java.lang.Boolean = uninitialized

  override def equals(o: Any): Boolean = o match
    case l: LanguageInspection => this.id == l.id
    case _                     => false

  override def hashCode: Int = id.toInt
