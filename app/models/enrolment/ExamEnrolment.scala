// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.enrolment

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.exam.{Exam, ExamState}
import models.iop.{CollaborativeExam, ExternalExam}
import models.sections.ExamSection
import models.user.User
import services.datetime.JsonInstant

import java.time.Instant
import java.util.Random
import scala.compiletime.uninitialized

@Entity
class ExamEnrolment extends GeneratedIdentityModel with Ordered[ExamEnrolment]:
  @ManyToOne
  @JsonManagedReference
  var user: User = uninitialized

  @ManyToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @ManyToOne
  @JsonBackReference
  var collaborativeExam: CollaborativeExam = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  @JsonBackReference
  var externalExam: ExternalExam = uninitialized

  @OneToOne(cascade = Array(CascadeType.REMOVE))
  var reservation: Reservation = uninitialized

  @ManyToOne
  var examinationEventConfiguration: ExaminationEventConfiguration = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JoinTable(
    name = "exam_enrolment_optional_exam_section",
    joinColumns = Array(new JoinColumn(name = "exam_enrolment_id")),
    inverseJoinColumns = Array(new JoinColumn(name = "exam_section_id"))
  )
  var optionalSections: java.util.Set[ExamSection] = uninitialized

  @JsonInstant
  var enrolledOn: Instant = uninitialized

  var information: String          = uninitialized
  var reservationCanceled: Boolean = false
  var preEnrolledUserEmail: String = uninitialized
  var noShow: Boolean              = false
  var retrialPermitted: Boolean    = false
  var delay: Int                   = 0

  def isProcessed: Boolean =
    Option(exam).isDefined && exam.hasState(
      ExamState.GRADED_LOGGED,
      ExamState.ARCHIVED,
      ExamState.DELETED
    )

  def setRandomDelay(): Unit = delay = new Random().nextInt(ExamEnrolment.DelayMax)

  override def compare(other: ExamEnrolment): Int =
    (Option(reservation), Option(other.reservation)) match
      case (None, None)       => 0
      case (None, _)          => -1
      case (_, None)          => 1
      case (Some(r), Some(o)) => r.compare(o)

  override def equals(o: Any): Boolean = o match
    case e: ExamEnrolment => this.id == e.id
    case _                => false

  override def hashCode: Int = id.toInt

object ExamEnrolment:
  private val DelayMax = 30 * 1000
