// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonIgnore}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.Exam

import scala.compiletime.uninitialized

@Entity
class ExaminationEventConfiguration extends GeneratedIdentityModel:
  @ManyToOne
  @JoinColumn(name = "exam_id")
  @JsonBackReference
  var exam: Exam = uninitialized

  @OneToOne
  var examinationEvent: ExaminationEvent = uninitialized

  @OneToMany(mappedBy = "examinationEventConfiguration")
  @JsonBackReference
  var examEnrolments: java.util.Set[ExamEnrolment] = uninitialized

  @Lob
  @JsonIgnore
  var encryptedSettingsPassword: Array[Byte] = uninitialized

  @Lob
  @JsonIgnore
  var encryptedQuitPassword: Array[Byte] = uninitialized

  @JsonIgnore var settingsPasswordSalt: String = uninitialized
  @JsonIgnore var quitPasswordSalt: String     = uninitialized
  @JsonIgnore var configKey: String            = uninitialized
  @JsonIgnore var hash: String                 = uninitialized

  @Transient var settingsPassword: String = uninitialized
  @Transient var quitPassword: String     = uninitialized

  override def equals(o: Any): Boolean = o match
    case e: ExaminationEventConfiguration =>
      this.exam == e.exam && this.examinationEvent == e.examinationEvent
    case _ => false

  override def hashCode: Int =
    val p = if exam != null then exam.hashCode else 0
    31 * p + (if examinationEvent != null then examinationEvent.hashCode else 0)
