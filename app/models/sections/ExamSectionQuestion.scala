// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.sections

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonProperty}
import features.exam.copy.ExamCopyContext
import jakarta.persistence.*
import models.base.OwnedModel
import models.questions.*
import play.api.Logging

import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*
import scala.util.Random

@Entity
class ExamSectionQuestion extends OwnedModel with Ordered[ExamSectionQuestion] with Sortable
    with Scorable with Logging:

  @ManyToOne
  @JoinColumn(name = "exam_section_id")
  @JsonBackReference
  var examSection: ExamSection = uninitialized

  @ManyToOne(cascade = Array(CascadeType.PERSIST))
  @JoinColumn(name = "question_id")
  var question: Question = uninitialized

  @OneToMany(
    cascade = Array(CascadeType.ALL),
    orphanRemoval = true,
    mappedBy = "examSectionQuestion"
  )
  @OrderBy("option.id") // TODO: is this needed somewhere?
  var options: java.util.List[ExamSectionQuestionOption] = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  @JsonProperty
  var essayAnswer: EssayAnswer = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  @JsonProperty
  var clozeTestAnswer: ClozeTestAnswer = uninitialized

  var sequenceNumber: Int                    = 0
  var answerInstructions: String             = uninitialized
  var maxScore: java.lang.Double             = uninitialized
  var negativeScoreAllowed: Boolean          = false
  var optionShufflingOn: Boolean             = false
  var forcedScore: java.lang.Double          = uninitialized
  var evaluationType: QuestionEvaluationType = uninitialized
  var evaluationCriteria: String             = uninitialized
  var expectedWordCount: Integer             = uninitialized

  @Transient var derivedMaxScore: Double      = uninitialized
  @Transient var derivedAssessedScore: Double = uninitialized
  @Transient var derivedMinScore: Double      = uninitialized
  def setDerivedMaxScore(): Unit              = derivedMaxScore = getMaxAssessedScore
  def setDerivedAssessedScore(): Unit         = derivedAssessedScore = getAssessedScore
  def setDerivedMinScore(): Unit              = derivedMinScore = getMinScore

  override def getOrdinal: Integer          = sequenceNumber
  override def setOrdinal(o: Integer): Unit = sequenceNumber = o

  override def getAssessedScore: Double =
    // Helper to handle the recurring forcedScore logic safely
    def withForcedScore(fallback: => Double): Double =
      Option(forcedScore).filter(_ != 0).map(_.toDouble).getOrElse(fallback)

    question.`type` match
      case QuestionType.EssayQuestion =>
        val score = if evaluationType == QuestionEvaluationType.Points then
          Option(essayAnswer).map(_.evaluatedScore.toDouble).getOrElse(0.0)
        else 0.0
        if score == 0 then 0.0 else score
      case QuestionType.MultipleChoiceQuestion =>
        withForcedScore {
          options.asScala
            .find(_.answered)
            .filter(_.option.correctOption)
            .map(_ => maxScore.toDouble) // Force to primitive
            .getOrElse(0.0)
        }
      case QuestionType.WeightedMultipleChoiceQuestion =>
        withForcedScore {
          val eval = options.asScala.filter(_.answered).map(_.score.toDouble).sum
          if negativeScoreAllowed then eval else math.max(0.0, eval)
        }
      case QuestionType.ClozeTestQuestion =>
        withForcedScore {
          Option(clozeTestAnswer).map(_.calculateScore(this)) match
            case Some(s) if (s.correctAnswers + s.incorrectAnswers) > 0 =>
              val total = (s.correctAnswers + s.incorrectAnswers).toDouble
              BigDecimal(s.correctAnswers.toDouble * maxScore.toDouble / total)
                .setScale(2, BigDecimal.RoundingMode.HALF_UP)
                .toDouble
            case _ => 0.0
        }
      case QuestionType.ClaimChoiceQuestion =>
        withForcedScore { options.asScala.find(_.answered).map(_.score.toDouble).getOrElse(0.0) }
      case null => 0.0

  override def getMaxAssessedScore: Double =
    question.`type` match
      case QuestionType.EssayQuestion =>
        if evaluationType == QuestionEvaluationType.Points then
          if maxScore == 0 then 0 else maxScore
        else 0.0
      case QuestionType.MultipleChoiceQuestion | QuestionType.ClozeTestQuestion =>
        if maxScore == 0 then 0 else maxScore
      case QuestionType.WeightedMultipleChoiceQuestion =>
        options.asScala.filter(o => o.isLegitScore(negativeScoreAllowed) && o.score >= 0).map(
          _.score.toDouble
        ).sum
      case QuestionType.ClaimChoiceQuestion =>
        options.asScala.map(_.score.toDouble).filter(_ != 0).maxOption.getOrElse(0.0)
      case null => 0.0 // This should never happen, java enum interop stuff

  def getMinScore: Double =
    question.`type` match
      case QuestionType.WeightedMultipleChoiceQuestion =>
        options.asScala.filter(o => o.isLegitScore(negativeScoreAllowed) && o.score <= 0).map(
          _.score.toDouble
        ).sum
      case QuestionType.ClaimChoiceQuestion =>
        options.asScala.map(_.score.toDouble).filter(_ != 0).minOption.getOrElse(0.0)
      case _ => 0.0

  override def isRejected: Boolean =
    question.`type` == QuestionType.EssayQuestion &&
      evaluationType == QuestionEvaluationType.Selection &&
      essayAnswer != null && essayAnswer.evaluatedScore == 0

  override def isApproved: Boolean =
    question.`type` == QuestionType.EssayQuestion &&
      evaluationType == QuestionEvaluationType.Selection &&
      essayAnswer != null && essayAnswer.evaluatedScore == 1

  def copy(context: ExamCopyContext): ExamSectionQuestion =
    val esqCopy = new ExamSectionQuestion
    if context.shouldCopyAnswers then
      copyScalarFields(esqCopy)
      esqCopy.question = question
      esqCopy.evaluationType = evaluationType
      copyQuestionWithAnswers(esqCopy, context)
      if essayAnswer != null then esqCopy.essayAnswer = essayAnswer.copy()
      if clozeTestAnswer != null then esqCopy.clozeTestAnswer = clozeTestAnswer.copy()
    else
      copyScalarFields(esqCopy)
      esqCopy.evaluationType = evaluationType
      if context.isStudentExam then
        copyQuestionWithOptions(esqCopy, context)
        if optionShufflingOn && question.`type` != QuestionType.ClaimChoiceQuestion then
          esqCopy.shuffleOptions()
      else
        esqCopy.question = question
        esqCopy.creator = creator
        esqCopy.created = created
        options.asScala.foreach(o => esqCopy.options.add(o.copy()))
    esqCopy

  private def copyScalarFields(dest: ExamSectionQuestion): Unit =
    dest.sequenceNumber = sequenceNumber
    dest.answerInstructions = answerInstructions
    dest.maxScore = maxScore
    dest.negativeScoreAllowed = negativeScoreAllowed
    dest.optionShufflingOn = optionShufflingOn
    dest.forcedScore = forcedScore
    dest.evaluationCriteria = evaluationCriteria
    dest.expectedWordCount = expectedWordCount

  private def copyQuestionWithAnswers(
      esqCopy: ExamSectionQuestion,
      context: ExamCopyContext
  ): Unit =
    val (blueprint, optionMap) = question.copyWithOptions(context.shouldSetParent)
    if context.shouldSetParent then blueprint.parent = question
    blueprint.save()
    persistQuestionOwners(blueprint, context)
    options.asScala.foreach { opt =>
      Option(opt.option).filter(_.id != 0) match
        case Some(parentOpt) =>
          optionMap.get(parentOpt.id) match
            case Some(optCopy) =>
              optCopy.question = blueprint
              optCopy.save()
              val esqoCopy = opt.copyWithAnswer()
              esqoCopy.option = optCopy
              esqCopy.options.add(esqoCopy)
            case None =>
              logger.error("Failed to copy a multi-choice question option!")
              throw new RuntimeException()
        case None =>
          logger.error("Failed to copy a multi-choice question option!")
          throw new RuntimeException()
    }
    esqCopy.question = blueprint

  private def copyQuestionWithOptions(
      esqCopy: ExamSectionQuestion,
      context: ExamCopyContext
  ): Unit =
    val (blueprint, optionMap) = question.copyWithOptions(context.shouldSetParent)
    if context.shouldSetParent then blueprint.parent = question
    blueprint.save()
    persistQuestionOwners(blueprint, context)
    optionMap.foreach { (k, optCopy) =>
      optCopy.question = blueprint
      optCopy.save()
      options.asScala.find(_.option.id == k) match
        case Some(esqo) =>
          val esqoCopy = esqo.copy()
          esqoCopy.option = optCopy
          esqCopy.options.add(esqoCopy)
        case None =>
          logger.error("Failed to copy a multi-choice question option!")
          throw new RuntimeException()
    }
    esqCopy.question = blueprint

  private def persistQuestionOwners(blueprint: Question, context: ExamCopyContext): Unit =
    if context.shouldSetParent && !blueprint.questionOwners.isEmpty then
      blueprint.questionOwners = new java.util.HashSet(blueprint.questionOwners)
      blueprint.save()

  private def shuffleOptions(): Unit =
    // need to wrap with a java list for interop with ebean/gson
    options = new java.util.ArrayList(Random.shuffle(options.asScala.toSeq).asJava)

  def addOption(option: ExamSectionQuestionOption, preserveScores: Boolean): Unit =
    if question.`type` != QuestionType.ClaimChoiceQuestion then
      if question.`type` != QuestionType.WeightedMultipleChoiceQuestion || option.score == 0 || preserveScores
      then options.add(option)
      else
        if option.score > 0 then
          val opts  = options.asScala.filter(o => o.score != 0 && o.score > 0).toSeq
          val delta = calculateOptionScores(option.score, opts)
          option.score = option.score.toDouble + delta
        else if option.score < 0 then
          val opts  = options.asScala.filter(o => o.score != 0 && o.score < 0).toSeq
          val delta = calculateOptionScores(option.score, opts)
          option.score = option.score.toDouble + delta
        options.add(option)

  def removeOption(option: MultipleChoiceOption, preserveScores: Boolean): Unit =
    if question.`type` != QuestionType.ClaimChoiceQuestion then
      options.asScala.find(o => option == o.option).foreach { esqo =>
        val score = esqo.score
        options.remove(esqo)
        if question.`type` == QuestionType.WeightedMultipleChoiceQuestion && score != 0 && !preserveScores
        then
          if score > 0 then
            val opts = options.asScala.filter(o => o.score != 0 && o.score > 0).toSeq
            initOptionScore(score, opts)
          else if score < 0 then
            val opts = options.asScala.filter(o => o.score != 0 && o.score < 0).toSeq
            initOptionScore(score, opts)
      }

  private def initOptionScore(score: Double, opts: Seq[ExamSectionQuestionOption]): Unit =
    val delta = calculateOptionScores(score * -1, opts)
    opts.headOption.foreach(first =>
      first.score = first.score.toDouble + delta
    )

  private def calculateOptionScores(
      optionScore: Double,
      opts: Seq[ExamSectionQuestionOption]
  ): Double =
    var oldSum = BigDecimal(0)
    var sum    = BigDecimal(0)
    for o <- opts do
      oldSum += BigDecimal(o.score.toDouble)
      o.score = roundToTwoDigits(o.score.toDouble - optionScore / opts.size)
      sum += BigDecimal(o.score.toDouble)
    (oldSum - BigDecimal(optionScore) - sum)
      .round(new java.math.MathContext(1))
      .toDouble

  private def roundToTwoDigits(score: Double): Double = math.round(score * 100) / 100.0

  override def compare(o: ExamSectionQuestion): Int = sequenceNumber - o.sequenceNumber

  override def equals(o: Any): Boolean = o match
    case e: ExamSectionQuestion => this.examSection == e.examSection && this.question == e.question
    case _                      => false

  override def hashCode: Int =
    val p = if examSection != null then examSection.hashCode else 0
    31 * p + (if question != null then question.hashCode else 0)
