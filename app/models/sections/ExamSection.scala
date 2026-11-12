// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

import cats.syntax.all.*
import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import features.exam.copy.ExamCopyContext
import jakarta.persistence.*
import models.base.OwnedModel
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.questions.Question

import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*
import scala.util.Random

@Entity
final class ExamSection extends OwnedModel with Ordered[ExamSection] with Sortable:
  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "examSection")
  @JsonManagedReference
  var sectionQuestions: java.util.Set[ExamSectionQuestion] = uninitialized

  @ManyToOne
  @JsonBackReference
  var exam: Exam = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JoinTable(
    name = "exam_section_material",
    joinColumns = Array(new JoinColumn(name = "exam_section_id")),
    inverseJoinColumns = Array(new JoinColumn(name = "exam_material_id"))
  )
  var examMaterials: java.util.Set[ExamMaterial] = uninitialized

  @ManyToMany(mappedBy = "optionalSections", cascade = Array(CascadeType.ALL))
  var examEnrolments: java.util.Set[ExamEnrolment] = uninitialized

  var name: String            = uninitialized
  var sequenceNumber: Integer = uninitialized
  var expanded: Boolean       = false
  var lotteryOn: Boolean      = false
  var optional: Boolean       = false
  var lotteryItemCount: Int   = 0
  var description: String     = uninitialized

  override def getOrdinal: Integer          = sequenceNumber
  override def setOrdinal(o: Integer): Unit = sequenceNumber = o

  def shuffleQuestions(): Unit =
    sectionQuestions =
      new java.util.HashSet( // need to wrap with a java set for interop with ebean/gson
        Random.shuffle(sectionQuestions.asScala.toSeq).take(lotteryItemCount).asJava)

  /** Left as in ExamSectionQuestion.copy, with the same need for a transaction. */
  def copy(exam: Exam, context: ExamCopyContext): Either[String, ExamSection] =
    val section = new ExamSection
    copyScalarFields(section)
    section.exam = exam
    if context.shouldCopyAnswers then
      section.examMaterials = examMaterials
      sectionQuestions.asScala.toList.traverse(_.copy(context)).map { copies =>
        copies.foreach(section.sectionQuestions.add)
        section
      }
    else
      copyMaterials(section, context)
      sectionQuestions.asScala.toList.traverse(_.copy(context)).map { copies =>
        copies.foreach { esqCopy =>
          esqCopy.setCreatorWithDate(context.getUser)
          esqCopy.setModifierWithDate(context.getUser)
          section.sectionQuestions.add(esqCopy)
        }
        if context.isStudentExam && lotteryOn then section.shuffleQuestions()
        section
      }

  private def copyScalarFields(dest: ExamSection): Unit =
    dest.name = name
    dest.sequenceNumber = sequenceNumber
    dest.expanded = expanded
    dest.lotteryOn = lotteryOn
    dest.optional = optional
    dest.lotteryItemCount = lotteryItemCount
    dest.description = description

  private def copyMaterials(section: ExamSection, context: ExamCopyContext): Unit =
    if context.isStudentExam then
      for em <- examMaterials.asScala do
        val emCopy = em.copy(context.getUser)
        emCopy.save()
        section.examMaterials.add(emCopy)
    else
      section.examMaterials = examMaterials

  def getTotalScore: Double = sectionQuestions.asScala.toSeq.map(_.getAssessedScore).sum
  def getMaxScore: Double   = sectionQuestions.asScala.toSeq.map(_.getMaxAssessedScore).sum
  def getRejectedCount: Int = sectionQuestions.asScala.count(_.isRejected)
  def getApprovedCount: Int = sectionQuestions.asScala.count(_.isApproved)
  def hasQuestion(question: Question): Boolean =
    sectionQuestions.asScala.exists(_.question == question)

  override def compare(o: ExamSection): Int = sequenceNumber - o.sequenceNumber

  override def equals(o: Any): Boolean = o match
    case e: ExamSection => this.id == e.id
    case _              => false

  override def hashCode: Int = id.toInt
