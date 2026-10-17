// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import com.fasterxml.jackson.annotation.JsonManagedReference
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam
import models.user.User
import services.datetime.JsonInstant

import java.time.Instant
import scala.compiletime.uninitialized

@Entity
class ExamRecord extends GeneratedIdentityModel:
  @OneToOne
  var teacher: User = uninitialized

  @OneToOne
  var student: User = uninitialized

  @OneToOne
  var exam: Exam = uninitialized

  @OneToOne
  @JsonManagedReference
  var examScore: ExamScore = uninitialized

  @JsonInstant
  var timeStamp: Instant = uninitialized

  var releasable: Boolean = false
