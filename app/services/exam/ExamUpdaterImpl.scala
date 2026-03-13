// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.exam

import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.AutoEvaluationReleaseType
import models.assessment.ExamFeedbackReleaseType
import models.assessment.{AutoEvaluationConfig, ExamFeedbackConfig, GradeEvaluation}
import models.exam.*
import models.questions.QuestionType
import models.questions.{ClozeTestAnswer, Question}
import models.user.{Language, Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.mvc.Result
import play.api.mvc.Results.{BadRequest, Forbidden}
import services.config.ConfigReader
import services.mail.EmailComposer

import java.util.concurrent.ThreadLocalRandom
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ExamUpdaterImpl @Inject() (
    emailComposer: EmailComposer,
    configReader: ConfigReader
) extends ExamUpdater
    with EbeanQueryExtensions
    with Logging:

  override def updateTemporalFieldsAndValidate(
      exam: Exam,
      user: User,
      payload: Exam
  ): Option[Result] =
    val newDuration = Option(payload.duration)
    val newStart    = Option(payload.periodStart)
    val newEnd      = Option(payload.periodEnd)

    // For printout exams everything is allowed
    if exam.isPrintout then
      exam.duration = newDuration.orNull
      None
    else
      // Check unsupervised exam constraints
      val unsupervisedCheck =
        if exam.isUnsupervised && newEnd.isDefined then
          val dates = exam.examinationEventConfigurations.asScala
            .map(_.examinationEvent.start)
            .toSet
          if dates.exists(_.isAfter(newEnd.get)) then
            Some(Forbidden("i18n_error_future_reservations_exist"))
          else None
        else None

      unsupervisedCheck.orElse {
        val hasFutureRes = hasFutureReservations(exam)
        val isAdmin      = user.isAdminOrSupport

        // Update start date
        val startDateCheck = newStart.flatMap { start =>
          if isAdmin || !hasFutureRes || isNonRestrictingValidityChange(
              start,
              exam,
              isStartDate = true
            )
          then
            exam.periodStart = start
            None
          else Some(Forbidden("i18n_error_future_reservations_exist"))
        }

        startDateCheck.orElse {
          // Update end date
          val endDateCheck = newEnd.flatMap { end =>
            if isAdmin || !hasFutureRes || isNonRestrictingValidityChange(
                end,
                exam,
                isStartDate = false
              )
            then
              exam.periodEnd = end
              None
            else Some(Forbidden("i18n_error_future_reservations_exist"))
          }

          endDateCheck.orElse {
            // Update duration
            newDuration.flatMap { duration =>
              if Option(exam.duration).contains(duration) || !hasFutureRes || isAdmin then
                exam.duration = duration
                None
              else Some(Forbidden("i18n_error_future_reservations_exist"))
            }
          }
        }
      }

  override def updateStateAndValidate(exam: Exam, user: User, payload: Exam): Option[Result] =
    Option(payload.state).flatMap {
      case state @ ExamState.PRE_PUBLISHED =>
        // Exam is pre-published or about to be pre-published
        val error = getFormValidationError(!exam.isPrintout, payload).orElse {
          if exam.examLanguages.isEmpty then Some(BadRequest("no exam languages specified"))
          else None
        }
        exam.state = state
        error

      case state @ ExamState.PUBLISHED =>
        // Exam is published or about to be published
        getFormValidationError(!exam.isPrintout, payload)
          .orElse {
            // Check for unnamed sections
            if exam.examSections.asScala.exists(_.name == null) then
              Some(BadRequest("i18n_exam_contains_unnamed_sections"))
            else None
          }
          .orElse {
            if exam.examLanguages.isEmpty then Some(BadRequest("no exam languages specified"))
            else None
          }
          .orElse {
            // Check maturity exam requirements
            if exam.executionType.`type` == ExamExecutionType.Type.MATURITY.toString then
              if Option(payload.subjectToLanguageInspection).isEmpty then
                Some(BadRequest("language inspection requirement not configured"))
              else None
            else None
          }
          .orElse {
            // Check SEB password configuration
            if exam.implementation == ExamImplementation.CLIENT_AUTH then
              if exam.examinationEventConfigurations.asScala.exists(
                  _.encryptedSettingsPassword == null
                )
              then
                Some(BadRequest("settings password not configured"))
              else None
            else None
          }
          .orElse {
            // Check private exam participants
            if exam.isPrivate && exam.state != ExamState.PUBLISHED then
              if exam.examEnrolments.isEmpty then Some(BadRequest("i18n_no_participants"))
              else
                notifyParticipantsAboutPrivateExamPublication(exam, user)
                None
            else None
          }
          .orElse {
            // Check printout exam dates
            if exam.isPrintout && exam.examinationDates.isEmpty then
              Some(BadRequest("no examination dates specified"))
            else None
          }
          .map { error =>
            error // Don't set state if there's an error
          }
          .orElse {
            exam.state = state
            None
          }

      case state =>
        exam.state = state
        None
    }

  override def update(exam: Exam, payload: Exam, loginRole: Role.Name): Unit =
    val examName                   = Option(payload.name)
    val shared                     = payload.shared
    val grading                    = Option(payload.grade).map(_.id)
    val answerLanguage             = Option(payload.answerLanguage)
    val instruction                = Option(payload.instruction)
    val enrollInstruction          = Option(payload.enrollInstruction)
    val examType                   = Option(payload.examType).map(_.`type`)
    val organisations              = Option(payload.organisations)
    val trialCount                 = payload.trialCount
    val requiresLanguageInspection = payload.subjectToLanguageInspection
    val internalRef                = payload.internalRef
    val anonymous                  = payload.anonymous
    val impl = Option(payload.implementation).getOrElse(ExamImplementation.AQUARIUM)

    examName.foreach(v => exam.name = v)
    exam.shared = shared

    grading.foreach(updateGrading(exam, _))

    answerLanguage.foreach(v => exam.answerLanguage = v)
    instruction.foreach(v => exam.instruction = v)
    enrollInstruction.foreach(v => exam.enrollInstruction = v)

    if exam.state != ExamState.PUBLISHED then
      organisations match
        case Some(orgs) =>
          val homeOrg = configReader.getHomeOrganisationRef
          val updated = if orgs.contains(homeOrg) then orgs else s"$homeOrg;$orgs"
          exam.organisations = updated
        case None =>
          exam.organisations = null

    examType.foreach { typeStr =>
      Option(DB.find(classOf[ExamType]).where().eq("type", typeStr).findOne()).foreach(t =>
        exam.examType = t
      )
    }

    exam.trialCount = trialCount
    exam.subjectToLanguageInspection = requiresLanguageInspection
    exam.internalRef = internalRef

    // Set implementation based on config
    impl match
      case ExamImplementation.WHATEVER if configReader.isHomeExaminationSupported =>
        exam.implementation = impl
      case ExamImplementation.CLIENT_AUTH if configReader.isSebExaminationSupported =>
        exam.implementation = impl
      case _ =>
        exam.implementation = ExamImplementation.AQUARIUM

    // Update anonymous flag for admins on public exams
    if (loginRole == Role.Name.ADMIN || loginRole == Role.Name.SUPPORT) &&
      exam.executionType.`type` == ExamExecutionType.Type.PUBLIC.toString &&
      !hasFutureReservations(exam)
    then exam.anonymous = anonymous

  override def isPermittedToUpdate(exam: Exam, user: User): Boolean =
    user.isAdminOrSupport || exam.isOwnedOrCreatedBy(user)

  override def isAllowedToUpdate(exam: Exam, user: User): Boolean =
    user.isAdminOrSupport || !hasFutureReservations(exam)

  override def isAllowedToRemove(exam: Exam): Boolean =
    !hasFutureReservations(exam) && !hasFutureEvents(exam) && exam.children.isEmpty

  override def updateExamFeedbackConfig(exam: Exam, newConfig: ExamFeedbackConfig): Unit =
    val config = exam.examFeedbackConfig

    Option(newConfig) match
      case None =>
        // User wishes to disable the config
        Option(config).foreach { c =>
          c.delete()
          exam.examFeedbackConfig = null
        }

      case Some(nc) =>
        val finalConfig = Option(config).getOrElse {
          val c = new ExamFeedbackConfig()
          c.exam = exam
          exam.examFeedbackConfig = c
          c
        }

        finalConfig.releaseType = nc.releaseType
        if finalConfig.releaseType == ExamFeedbackReleaseType.GIVEN_DATE then
          finalConfig.releaseDate = nc.releaseDate
        else finalConfig.releaseDate = null

        finalConfig.save()
        exam.examFeedbackConfig = finalConfig

  override def updateAutoEvaluationConfig(exam: Exam, newConfig: AutoEvaluationConfig): Unit =
    val config = exam.autoEvaluationConfig

    Option(newConfig) match
      case None =>
        // User wishes to disable the config
        Option(config).foreach { c =>
          c.delete()
          exam.autoEvaluationConfig = null
        }

      case Some(nc) =>
        if exam.executionType.`type` != ExamExecutionType.Type.MATURITY.toString then
          val finalConfig = Option(config).getOrElse {
            val c = new AutoEvaluationConfig()
            c.gradeEvaluations = new java.util.HashSet[GradeEvaluation]()
            c.exam = exam
            exam.autoEvaluationConfig = c
            c
          }

          finalConfig.releaseType = nc.releaseType
          finalConfig.releaseType match
            case AutoEvaluationReleaseType.GIVEN_AMOUNT_DAYS =>
              finalConfig.amountDays = nc.amountDays
              finalConfig.releaseDate = null
            case AutoEvaluationReleaseType.GIVEN_DATE =>
              finalConfig.releaseDate = nc.releaseDate
              finalConfig.amountDays = null
            case _ =>
              finalConfig.releaseDate = null
              finalConfig.amountDays = null

          finalConfig.save()
          updateGradeEvaluations(exam, nc)
          exam.autoEvaluationConfig = finalConfig
        else
          logger.warn(
            "Attempting to set auto evaluation config for maturity type. Refusing to do so"
          )

  override def updateLanguage(exam: Exam, code: String, user: User): Option[Result] =
    if !isPermittedToUpdate(exam, user) then Some(Forbidden("i18n_error_access_forbidden"))
    else
      Option(DB.find(classOf[Language], code)).foreach { language =>
        if exam.examLanguages.contains(language) then exam.examLanguages.remove(language)
        else exam.examLanguages.add(language)
      }
      None

  override def preparePreview(exam: Exam): Unit =
    val questionsToHide = scala.collection.mutable.Set.empty[Question]

    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(_.question.`type` == QuestionType.ClozeTestQuestion)
      .foreach { esq =>
        val answer = new ClozeTestAnswer()
        answer.setQuestion(esq)
        esq.clozeTestAnswer = answer
        questionsToHide += esq.question
      }

    questionsToHide.foreach(_.question = null)
    exam.examSections.asScala.filter(_.lotteryOn).foreach(_.shuffleQuestions())
    exam.setDerivedMaxScores()

  // Private helper methods

  private def updateGradeEvaluations(exam: Exam, newConfig: AutoEvaluationConfig): Unit =
    val config             = exam.autoEvaluationConfig
    val gradeMap           = config.asGradeMap
    val handledEvaluations = scala.collection.mutable.ListBuffer.empty[Int]
    val gs                 = Option(exam.gradeScale).getOrElse(exam.course.gradeScale)

    // Handle proposed entries, persist new ones where necessary
    newConfig.gradeEvaluations.asScala.foreach { src =>
      Option(DB.find(classOf[Grade], src.grade.id)).foreach { grade =>
        if gs.grades.contains(grade) then
          val ge = gradeMap.getOrElse(
            grade.id, {
              val newGe = new GradeEvaluation()
              newGe.grade = grade
              newGe.autoEvaluationConfig = config
              config.gradeEvaluations.add(newGe)
              newGe
            }
          )
          ge.percentage = src.percentage
          ge.save()
          handledEvaluations += grade.id
        else throw new IllegalArgumentException("unknown grade")
      }
    }

    // Remove obsolete entries
    gradeMap
      .filterNot { case (key, _) => handledEvaluations.contains(key) }
      .foreach { case (_, value) =>
        value.delete()
        config.gradeEvaluations.remove(value)
      }

  private def hasFutureReservations(exam: Exam): Boolean =
    val now = DateTime.now()
    exam.examEnrolments.asScala
      .map(_.reservation)
      .exists(r => Option(r).exists(_.endAt.isAfter(now)))

  private def hasFutureEvents(exam: Exam): Boolean =
    val now = DateTime.now()
    exam.examEnrolments.asScala
      .map(_.examinationEventConfiguration)
      .exists(eec => Option(eec).exists(_.examinationEvent.start.isAfter(now)))

  private def getFormValidationError(checkPeriod: Boolean, payload: Exam): Option[Result] =
    if !checkPeriod then None
    else
      val start = Option(payload.periodStart)
      val end   = Option(payload.periodEnd)

      (start, end) match
        case (None, _) =>
          Some(BadRequest("i18n_error_start_date"))
        case (_, None) =>
          Some(BadRequest("i18n_error_end_date"))
        case (Some(s), Some(e)) if s.isAfter(e) =>
          Some(BadRequest("i18n_error_end_sooner_than_start"))
        case _ =>
          None

  private def isNonRestrictingValidityChange(
      newDate: DateTime,
      exam: Exam,
      isStartDate: Boolean
  ): Boolean =
    val oldDate = if isStartDate then exam.periodStart else exam.periodEnd
    if isStartDate then !oldDate.isBefore(newDate)
    else !newDate.isBefore(oldDate)

  private def updateGrading(exam: Exam, grading: Int): Unit =
    // Allow updating grading if allowed in settings or if the course does not restrict the setting
    val canOverrideGrading = configReader.isCourseGradeScaleOverridable
    if canOverrideGrading || Option(exam.course).isEmpty || Option(exam.course)
        .flatMap(c => Option(c.gradeScale))
        .isEmpty
    then
      Option(DB.find(classOf[GradeScale]).fetch("grades").where().idEq(grading).findOne()) match
        case Some(scale) =>
          exam.gradeScale = scale
        case None =>
          logger.warn(s"Grade scale not found for ID $grading. Not gonna update exam with it")

  private def notifyParticipantsAboutPrivateExamPublication(exam: Exam, sender: User): Unit =
    val enrolments = exam.examEnrolments.asScala
      .map(_.user)
      .filter(_ != null)
      .toSet

    val preEnrolments = exam.examEnrolments.asScala
      .map(_.preEnrolledUserEmail)
      .filter(_ != null)
      .map { email =>
        val user = new User()
        user.id = ThreadLocalRandom.current().nextLong() // users are hashed based on id
        user.email = email
        user
      }
      .toSet

    val receivers = enrolments ++ preEnrolments

    emailComposer.scheduleEmail(1.second) {
      receivers.foreach { u =>
        emailComposer.composePrivateExamParticipantNotification(u, sender, exam)
        logger.info(s"Exam participation notification email sent to ${u.email}")
      }
    }
