// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import jakarta.persistence.*
import models.attachment.{Attachment, AttachmentContainer}
import models.base.OwnedModel
import models.sections.ExamSectionQuestion
import models.user.User

import scala.collection.immutable.SortedMap
import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*

@Entity
class Question extends OwnedModel with AttachmentContainer:
  @OneToMany(mappedBy = "parent")
  @JsonBackReference
  var children: java.util.List[Question] = uninitialized

  @OneToMany(mappedBy = "question")
  @JsonBackReference
  var examSectionQuestions: java.util.Set[ExamSectionQuestion] = uninitialized

  @OneToMany(cascade = Array(CascadeType.PERSIST, CascadeType.REMOVE), mappedBy = "question")
  @JsonManagedReference
  var options: java.util.List[MultipleChoiceOption] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JoinTable(
    name = "question_owner",
    joinColumns = Array(new JoinColumn(name = "question_id")),
    inverseJoinColumns = Array(new JoinColumn(name = "user_id"))
  )
  var questionOwners: java.util.Set[User] = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL))
  @JoinTable(
    name = "question_tag",
    joinColumns = Array(new JoinColumn(name = "question_id")),
    inverseJoinColumns = Array(new JoinColumn(name = "tag_id"))
  )
  var tags: java.util.List[Tag] = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL)) var attachment: Attachment = uninitialized
  @ManyToOne var parent: Question                                        = uninitialized

  var `type`: QuestionType                          = uninitialized
  var question: String                              = uninitialized
  var shared: Boolean                               = false
  var state: String                                 = uninitialized
  var defaultEvaluationCriteria: String             = uninitialized
  var defaultEvaluationType: QuestionEvaluationType = uninitialized
  var defaultAnswerInstructions: String             = uninitialized
  var defaultMaxScore: java.lang.Double             = uninitialized
  var defaultExpectedWordCount: Integer             = uninitialized
  var defaultNegativeScoreAllowed: Boolean          = false
  var defaultOptionShufflingOn: Boolean             = false

  def getMaxDefaultScore: Double =
    `type` match
      case QuestionType.EssayQuestion =>
        if defaultEvaluationType == QuestionEvaluationType.Points
        then if defaultMaxScore == 0 then 0 else defaultMaxScore
        else 0.0
      case QuestionType.MultipleChoiceQuestion =>
        if defaultMaxScore == 0 then 0 else defaultMaxScore
      case QuestionType.WeightedMultipleChoiceQuestion =>
        options.asScala.filter(_.isLegitMaxScore).map(_.defaultScore.toDouble).sum
      case QuestionType.ClaimChoiceQuestion =>
        options.asScala.map(_.defaultScore.toDouble).maxOption.getOrElse(0.0)
      case _ => 0.0

  def getMinDefaultScore: Double =
    `type` match
      case QuestionType.WeightedMultipleChoiceQuestion =>
        options.asScala.filter(_.isLegitMinScore(defaultNegativeScoreAllowed)).map(
          _.defaultScore.toDouble
        ).sum
      case QuestionType.ClaimChoiceQuestion =>
        options.asScala.map(_.defaultScore.toDouble).minOption.getOrElse(0.0)
      case _ => 0.0

  def copy(): Question =
    val q = buildBase(setParent = true)
    options.asScala.foreach(opt => q.options.add(opt.copy()))
    copyAttachmentTo(q)
    q

  def copyWithOptions(setParent: Boolean): (Question, SortedMap[Long, MultipleChoiceOption]) =
    val q            = buildBase(setParent)
    val optionCopies = SortedMap.from(options.asScala.map(opt => opt.id.toLong -> opt.copy()))
    copyAttachmentTo(q)
    (q, optionCopies)

  private def buildBase(setParent: Boolean): Question =
    val q = new Question
    q.`type` = `type`
    q.question = question
    q.shared = shared
    q.state = state
    q.defaultEvaluationCriteria = defaultEvaluationCriteria
    q.defaultEvaluationType = defaultEvaluationType
    q.defaultAnswerInstructions = defaultAnswerInstructions
    q.defaultMaxScore = defaultMaxScore
    q.defaultExpectedWordCount = defaultExpectedWordCount
    q.defaultNegativeScoreAllowed = defaultNegativeScoreAllowed
    q.defaultOptionShufflingOn = defaultOptionShufflingOn
    if setParent then
      q.parent = this
      q.questionOwners = questionOwners
      q.creator = creator
      q.created = created
      q.modifier = modifier
      q.modified = modified
    q

  private def copyAttachmentTo(q: Question): Unit =
    if attachment != null then
      val copy = attachment.copy()
      copy.save()
      q.attachment = copy

  override def equals(o: Any): Boolean = o match
    case q: Question => this.id == q.id
    case _           => false

  override def toString: String = s"Question [type=${`type`}, id=$id]"

object Question:
  type Type = QuestionType
  val Type: Class[QuestionType] = classOf[QuestionType]
  type EvaluationType = QuestionEvaluationType
  val EvaluationType: Class[QuestionEvaluationType] = classOf[QuestionEvaluationType]
