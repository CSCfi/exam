// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.iop

import com.fasterxml.jackson.annotation.JsonManagedReference
import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ObjectNode
import jakarta.persistence.*
import models.base.GeneratedIdentityModel
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamState}
import org.joda.time.DateTime
import services.datetime.JsonDateTime
import services.json.JsonDeserializer

import java.util.List
import scala.compiletime.uninitialized

@Entity
class CollaborativeExam extends GeneratedIdentityModel:
  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "collaborativeExam")
  @JsonManagedReference
  var examEnrolments: List[ExamEnrolment] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "collaborativeExam")
  @JsonManagedReference
  var examParticipations: List[ExamParticipation] = uninitialized

  @Column(name = "exam_active_start_date")
  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var periodStart: DateTime = uninitialized

  @Column(name = "exam_active_end_date")
  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var periodEnd: DateTime = uninitialized

  @Temporal(TemporalType.TIMESTAMP)
  @JsonDateTime
  var created: DateTime = uninitialized

  var externalRef: String       = uninitialized // REFERENCE TO EXAM ELSEWHERE
  var revision: String          = uninitialized // REFERENCE TO EXAM REVISION ELSEWHERE
  var name: String              = uninitialized
  var hash: String              = uninitialized
  var state: ExamState          = uninitialized
  var duration: Integer         = uninitialized
  var enrollInstruction: String = uninitialized
  var anonymous: Boolean        = false

  def getExam(node: JsonNode): Exam =
    val objectNode = node.asInstanceOf[ObjectNode]
    objectNode.put("id", id).put("externalRef", externalRef)
    JsonDeserializer.deserialize(classOf[Exam], objectNode)

object CollaborativeExam:
  type State = ExamState
