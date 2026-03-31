// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.exam

import com.fasterxml.jackson.annotation.{JsonBackReference, JsonManagedReference}
import features.exam.copy.ExamCopyContext
import jakarta.persistence.*
import models.assessment.*
import models.attachment.{Attachment, AttachmentContainer}
import models.base.OwnedModel
import models.enrolment.{ExamEnrolment, ExamParticipation, ExaminationEventConfiguration}
import models.facility.Software
import models.questions.QuestionType
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.{Language, PermissionType, User}
import org.apache.commons.codec.digest.DigestUtils
import services.datetime.JsonInstant

import java.text.{DecimalFormat, DecimalFormatSymbols}
import java.time.Instant
import java.util.*
import scala.compiletime.uninitialized
import scala.jdk.CollectionConverters.*

@Entity
class Exam extends OwnedModel with Ordered[Exam] with AttachmentContainer:
  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "exam")
  @JsonManagedReference
  var examSections: java.util.Set[ExamSection] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "exam")
  @JsonManagedReference
  var examinationDates: java.util.Set[ExaminationDate] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "exam")
  @JsonManagedReference
  var examinationEventConfigurations: java.util.Set[ExaminationEventConfiguration] = uninitialized

  @OneToMany(mappedBy = "parent")
  @JsonBackReference
  var children: java.util.List[Exam] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "exam")
  @JsonManagedReference
  var examEnrolments: java.util.List[ExamEnrolment] = uninitialized

  @OneToMany(cascade = Array(CascadeType.ALL), mappedBy = "exam")
  @JsonManagedReference
  var examInspections: java.util.Set[ExamInspection] = uninitialized

  @OneToMany(mappedBy = "exam", cascade = Array(CascadeType.ALL))
  var inspectionComments: java.util.Set[InspectionComment] = uninitialized

  @ManyToMany
  @JoinTable(
    name = "exam_owner",
    joinColumns = Array(new JoinColumn(name = "exam_id")),
    inverseJoinColumns = Array(new JoinColumn(name = "user_id"))
  )
  var examOwners: java.util.Set[User] = uninitialized

  @OneToOne(mappedBy = "exam")
  @JsonManagedReference
  var examParticipation: ExamParticipation = uninitialized

  @OneToOne(mappedBy = "exam", cascade = Array(CascadeType.ALL))
  var autoEvaluationConfig: AutoEvaluationConfig = uninitialized

  @OneToOne(mappedBy = "exam", cascade = Array(CascadeType.ALL))
  var examFeedbackConfig: ExamFeedbackConfig = uninitialized

  @ManyToMany(cascade = Array(CascadeType.ALL)) var softwares: List[Software] = uninitialized
  @ManyToMany var examLanguages: java.util.List[Language]                     = uninitialized
  @ManyToOne var course: Course                                               = uninitialized
  @ManyToOne var examType: ExamType                                           = uninitialized
  @ManyToOne(cascade = Array(CascadeType.PERSIST)) var parent: Exam           = uninitialized
  @ManyToOne var gradeScale: GradeScale                                       = uninitialized
  @ManyToOne var grade: Grade                                                 = uninitialized
  @ManyToOne var creditType: ExamType                                         = uninitialized
  @ManyToOne var executionType: ExamExecutionType                             = uninitialized
  @ManyToOne var gradedByUser: User                                           = uninitialized
  @OneToOne var examFeedback: Comment                                         = uninitialized
  @OneToOne(cascade = Array(CascadeType.ALL)) var attachment: Attachment      = uninitialized
  @OneToOne(mappedBy = "exam") var examRecord: ExamRecord                     = uninitialized
  @OneToOne(mappedBy = "exam") var languageInspection: LanguageInspection     = uninitialized

  @JsonInstant
  @Column(name = "exam_active_start_date")
  var periodStart: Instant = uninitialized

  @JsonInstant
  @Column(name = "exam_active_end_date")
  var periodEnd: Instant = uninitialized

  @JsonInstant var gradedTime: Instant             = uninitialized
  @JsonInstant var autoEvaluationNotified: Instant = uninitialized

  var instruction: String                            = uninitialized
  var enrollInstruction: String                      = uninitialized
  var anonymous: Boolean                             = false
  var name: String                                   = uninitialized
  var shared: Boolean                                = false
  var hash: String                                   = uninitialized
  var duration: Integer                              = uninitialized
  var customCredit: java.lang.Double                 = uninitialized
  var answerLanguage: String                         = uninitialized
  var state: ExamState                               = uninitialized
  var implementation: ExamImplementation             = uninitialized
  var additionalInfo: String                         = uninitialized
  var trialCount: Integer                            = uninitialized
  var gradingType: GradeType                         = uninitialized
  var subjectToLanguageInspection: java.lang.Boolean = uninitialized
  var internalRef: String                            = uninitialized
  var assessmentInfo: String                         = uninitialized
  var organisations: String                          = uninitialized

  // Aggregate transient fields — explicitly set by Ebean
  @Transient var totalScore: Double       = uninitialized
  @Transient var maxScore: Double         = uninitialized
  @Transient var rejectedAnswerCount: Int = 0
  @Transient var approvedAnswerCount: Int = 0
  @Transient var cloned: Boolean          = false
  @Transient var external: Boolean        = false
  @Transient var externalRef: String      = uninitialized

  def getTotalScore: Double = math.max(toFixed(examSections.asScala.map(_.getTotalScore).sum), 0.0)
  def getMaxScore: Double   = toFixed(examSections.asScala.map(_.getMaxScore).sum)

  def setTotalScore(): Unit = totalScore = getTotalScore
  def setMaxScore(): Unit   = maxScore = getMaxScore
  def setRejectedAnswerCount(): Unit =
    rejectedAnswerCount = examSections.asScala.map(_.getRejectedCount).sum
  def setApprovedAnswerCount(): Unit =
    approvedAnswerCount = examSections.asScala.map(_.getApprovedCount).sum

  def generateHash(): Unit =
    hash = DigestUtils.md5Hex(name + state + new Random().nextDouble())

  def hasState(states: ExamState*): Boolean = states.contains(state)

  def isOwnedOrCreatedBy(user: User): Boolean = isCreatedBy(user) || isOwnedBy(user)

  def isInspectedOrCreatedOrOwnedBy(user: User): Boolean =
    isInspectedBy(user, applyToChildOnly = false) || isOwnedBy(user) || isCreatedBy(user)

  def isChildInspectedOrCreatedOrOwnedBy(user: User): Boolean =
    isInspectedBy(user, applyToChildOnly = true) || isOwnedBy(user) || isCreatedBy(user)

  def isViewableForLanguageInspector(user: User): Boolean =
    executionType != null &&
      executionType.`type` == ExamExecutionType.Type.MATURITY.toString &&
      user.hasPermission(PermissionType.CAN_INSPECT_LANGUAGE) &&
      languageInspection != null &&
      languageInspection.assignee != null

  def isPrivate: Boolean =
    executionType != null &&
      executionType.`type` != ExamExecutionType.Type.PUBLIC.toString &&
      !isPrintout

  def isPrintout: Boolean =
    executionType != null && executionType.`type` == ExamExecutionType.Type.PRINTOUT.toString

  def isUnsupervised: Boolean =
    executionType == null || executionType.`type` != ExamImplementation.AQUARIUM.toString

  def setDerivedMaxScores(): Unit =
    examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .foreach { esq =>
        esq.setDerivedMaxScore()
        val qType = Option(esq.question).map(_.`type`)
        if qType.contains(QuestionType.ClaimChoiceQuestion) || qType.contains(
            QuestionType.WeightedMultipleChoiceQuestion
          )
        then
          esq.setDerivedMinScore()
        esq.options.asScala.foreach(_.score = 0)
      }

  def createCopy(context: ExamCopyContext): Exam =
    val clone = scalarCopy()
    if !context.shouldExcludeExamOwners then clone.examOwners = examOwners
    if context.shouldSetParent then clone.parent = this
    clone.setCreatorWithDate(context.getUser)
    clone.setModifierWithDate(context.getUser)
    clone.generateHash()
    clone.save()

    if autoEvaluationConfig != null then
      val configClone = autoEvaluationConfig.copy()
      configClone.exam = clone
      configClone.save()
      clone.autoEvaluationConfig = configClone

    for ei <- examInspections.asScala do
      val inspection = new ExamInspection
      inspection.user = ei.user
      inspection.assignedBy = ei.assignedBy
      inspection.comment = ei.comment
      inspection.ready = ei.ready
      inspection.exam = clone
      inspection.save()

    for es <- selectSectionsToCopy(context) do
      val esCopy = es.copy(clone, context)
      esCopy.setCreatorWithDate(context.getUser)
      esCopy.setModifierWithDate(context.getUser)
      if context.shouldShuffleOptions then
        esCopy.sectionQuestions.asScala.foreach(shuffleQuestionOptions)
      esCopy.save()
      if context.isStudentExam then updateQuestionMetadata(esCopy, context.getUser)
      clone.examSections.add(esCopy)

    if attachment != null then
      clone.attachment = attachment.copy()

    clone

  def scalarCopy(): Exam =
    val dest = new Exam
    dest.name = name
    dest.state = state
    dest.implementation = implementation
    dest.course = course
    dest.examType = examType
    dest.instruction = instruction
    dest.enrollInstruction = enrollInstruction
    dest.shared = shared
    dest.examinationDates = examinationDates
    dest.examRecord = examRecord
    dest.examFeedbackConfig = examFeedbackConfig
    dest.languageInspection = languageInspection
    dest.periodStart = periodStart
    dest.periodEnd = periodEnd
    dest.duration = duration
    dest.gradeScale = gradeScale
    dest.customCredit = customCredit
    dest.examLanguages = examLanguages
    dest.answerLanguage = answerLanguage
    dest.grade = grade
    dest.softwares = softwares
    dest.gradedByUser = gradedByUser
    dest.gradedTime = gradedTime
    dest.examFeedback = examFeedback
    dest.additionalInfo = additionalInfo
    dest.trialCount = trialCount
    dest.creditType = creditType
    dest.executionType = executionType
    dest.inspectionComments = inspectionComments
    dest.autoEvaluationNotified = autoEvaluationNotified
    dest.gradingType = gradingType
    dest.subjectToLanguageInspection = subjectToLanguageInspection
    dest.internalRef = internalRef
    dest.assessmentInfo = assessmentInfo
    dest.organisations = organisations
    dest.anonymous = anonymous
    dest.modifier = modifier
    dest.modified = modified
    dest

  private def toFixed(v: Double): Double = Exam.Df.format(v).toDouble

  private def selectSectionsToCopy(context: ExamCopyContext): Iterable[ExamSection] =
    val sections = examSections.asScala
    val filtered =
      if context.shouldIncludeOnlySelectedSections then
        sections.filter(es => !es.optional || context.getSelectedSections.contains(es.id))
      else sections
    filtered.toList.sorted

  private def updateQuestionMetadata(section: ExamSection, user: User): Unit =
    for esq <- section.sectionQuestions.asScala do
      val q = esq.question
      q.setCreatorWithDate(user)
      q.setModifierWithDate(user)
      q.update()
      esq.save()

  private def shuffleQuestionOptions(esq: ExamSectionQuestion): Unit =
    val shouldShuffle =
      esq.optionShufflingOn &&
        Option(esq.question).map(_.`type`).forall(_ != QuestionType.ClaimChoiceQuestion)
    if shouldShuffle then
      val shuffled = new ArrayList(esq.options)
      Collections.shuffle(shuffled)
      esq.options = shuffled

  private def isCreatedBy(user: User): Boolean = creator != null && creator == user

  private def isInspectedBy(user: User, applyToChildOnly: Boolean): Boolean =
    val examToCheck = if parent == null || applyToChildOnly then this else parent
    examToCheck.examInspections.asScala.exists(_.user == user)

  private def isOwnedBy(user: User): Boolean =
    val examToCheck = if parent == null then this else parent
    examToCheck.examOwners.asScala.exists(_ == user)

  override def compare(other: Exam): Int = created.compareTo(other.created)

  override def equals(o: Any): Boolean = o match
    case e: Exam => this.id == e.id
    case _       => false

  override def hashCode: Int = id.toInt

object Exam:
  type State          = ExamState
  type Implementation = ExamImplementation

  private val Df = new DecimalFormat("#.##", new DecimalFormatSymbols(Locale.US))
