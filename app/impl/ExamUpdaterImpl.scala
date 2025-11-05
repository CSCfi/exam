// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl

import impl.mail.EmailComposer
import io.ebean.DB
import miscellaneous.config.ConfigReader
import miscellaneous.scala.DbApiHelper
import models.assessment.{AutoEvaluationConfig, ExamFeedbackConfig, GradeEvaluation}
import models.exam.*
import models.questions.{ClozeTestAnswer, Question}
import models.user.{Language, Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.mvc.Result
import play.api.mvc.Results.{BadRequest, Forbidden}
import play.mvc.Results.*

import java.util.concurrent.ThreadLocalRandom
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ExamUpdaterImpl @Inject() (
    emailComposer: EmailComposer,
    actorSystem: ActorSystem,
    configReader: ConfigReader
) extends ExamUpdater
    with DbApiHelper
    with Logging:

  override def updateTemporalFieldsAndValidate(exam: Exam, user: User, payload: Exam): Option[Result] =
    val newDuration = Option(payload.getDuration)
    val newStart    = Option(payload.getPeriodStart)
    val newEnd      = Option(payload.getPeriodEnd)

    // For printout exams everything is allowed
    if exam.isPrintout then
      exam.setDuration(newDuration.orNull)
      None
    else
      // Check unsupervised exam constraints
      val unsupervisedCheck =
        if exam.isUnsupervised && newEnd.isDefined then
          val dates = exam.getExaminationEventConfigurations.asScala
            .map(_.getExaminationEvent.getStart)
            .toSet
          if dates.exists(_.isAfter(newEnd.get)) then Some(Forbidden("i18n_error_future_reservations_exist"))
          else None
        else None

      unsupervisedCheck.orElse {
        val hasFutureRes = hasFutureReservations(exam)
        val isAdmin      = user.hasRole(Role.Name.ADMIN)

        // Update start date
        val startDateCheck = newStart.flatMap { start =>
          if isAdmin || !hasFutureRes || isNonRestrictingValidityChange(start, exam, isStartDate = true) then
            exam.setPeriodStart(start)
            None
          else Some(Forbidden("i18n_error_future_reservations_exist"))
        }

        startDateCheck.orElse {
          // Update end date
          val endDateCheck = newEnd.flatMap { end =>
            if isAdmin || !hasFutureRes || isNonRestrictingValidityChange(end, exam, isStartDate = false) then
              exam.setPeriodEnd(end)
              None
            else Some(Forbidden("i18n_error_future_reservations_exist"))
          }

          endDateCheck.orElse {
            // Update duration
            newDuration.flatMap { duration =>
              if Option(exam.getDuration).contains(duration) || !hasFutureRes || isAdmin then
                exam.setDuration(duration)
                None
              else Some(Forbidden("i18n_error_future_reservations_exist"))
            }
          }
        }
      }

  override def updateStateAndValidate(exam: Exam, user: User, payload: Exam): Option[Result] =
    Option(payload.getState).flatMap {
      case state @ Exam.State.PRE_PUBLISHED =>
        // Exam is pre-published or about to be pre-published
        val error = getFormValidationError(!exam.isPrintout, payload).orElse {
          if exam.getExamLanguages.isEmpty then Some(BadRequest("no exam languages specified"))
          else None
        }
        exam.setState(state)
        error

      case state @ Exam.State.PUBLISHED =>
        // Exam is published or about to be published
        getFormValidationError(!exam.isPrintout, payload)
          .orElse {
            // Check for unnamed sections
            if exam.getExamSections.asScala.exists(_.getName == null) then
              Some(BadRequest("i18n_exam_contains_unnamed_sections"))
            else None
          }
          .orElse {
            if exam.getExamLanguages.isEmpty then Some(BadRequest("no exam languages specified"))
            else None
          }
          .orElse {
            // Check maturity exam requirements
            if exam.getExecutionType.getType == ExamExecutionType.Type.MATURITY.toString then
              if payload.getSubjectToLanguageInspection == null then
                Some(BadRequest("language inspection requirement not configured"))
              else None
            else None
          }
          .orElse {
            // Check SEB password configuration
            if exam.getImplementation == Exam.Implementation.CLIENT_AUTH then
              if exam.getExaminationEventConfigurations.asScala.exists(_.getEncryptedSettingsPassword == null) then
                Some(BadRequest("settings password not configured"))
              else None
            else None
          }
          .orElse {
            // Check private exam participants
            if exam.isPrivate && exam.getState != Exam.State.PUBLISHED then
              if exam.getExamEnrolments.isEmpty then Some(BadRequest("i18n_no_participants"))
              else
                notifyParticipantsAboutPrivateExamPublication(exam, user)
                None
            else None
          }
          .orElse {
            // Check printout exam dates
            if exam.isPrintout && exam.getExaminationDates.isEmpty then
              Some(BadRequest("no examination dates specified"))
            else None
          }
          .map { error =>
            error // Don't set state if there's an error
          }
          .orElse {
            exam.setState(state)
            None
          }

      case state =>
        exam.setState(state)
        None
    }

  override def update(exam: Exam, payload: Exam, loginRole: Role.Name): Unit =
    val examName                   = Option(payload.getName)
    val shared                     = payload.isShared
    val grading                    = Option(payload.getGrade).map(_.getId)
    val answerLanguage             = Option(payload.getAnswerLanguage)
    val instruction                = Option(payload.getInstruction)
    val enrollInstruction          = Option(payload.getEnrollInstruction)
    val examType                   = Option(payload.getExamType).map(_.getType)
    val organisations              = Option(payload.getOrganisations)
    val trialCount                 = payload.getTrialCount
    val requiresLanguageInspection = payload.getSubjectToLanguageInspection
    val internalRef                = payload.getInternalRef
    val anonymous                  = payload.isAnonymous
    val impl                       = Option(payload.getImplementation).getOrElse(Exam.Implementation.AQUARIUM)

    examName.foreach(exam.setName)
    exam.setShared(shared)

    grading.foreach(updateGrading(exam, _))

    answerLanguage.foreach(exam.setAnswerLanguage)
    instruction.foreach(exam.setInstruction)
    enrollInstruction.foreach(exam.setEnrollInstruction)

    if exam.getState != Exam.State.PUBLISHED then
      organisations match
        case Some(orgs) =>
          val homeOrg = configReader.getHomeOrganisationRef
          val updated = if orgs.contains(homeOrg) then orgs else s"$homeOrg;$orgs"
          exam.setOrganisations(updated)
        case None =>
          exam.setOrganisations(null)

    examType.foreach { typeStr =>
      Option(DB.find(classOf[ExamType]).where().eq("type", typeStr).findOne()).foreach(exam.setExamType)
    }

    exam.setTrialCount(trialCount)
    exam.setSubjectToLanguageInspection(requiresLanguageInspection)
    exam.setInternalRef(internalRef)

    // Set implementation based on config
    impl match
      case Exam.Implementation.WHATEVER if configReader.isHomeExaminationSupported =>
        exam.setImplementation(impl)
      case Exam.Implementation.CLIENT_AUTH if configReader.isSebExaminationSupported =>
        exam.setImplementation(impl)
      case _ =>
        exam.setImplementation(Exam.Implementation.AQUARIUM)

    // Update anonymous flag for admins on public exams
    if loginRole == Role.Name.ADMIN &&
      exam.getExecutionType.getType == ExamExecutionType.Type.PUBLIC.toString &&
      !hasFutureReservations(exam)
    then exam.setAnonymous(anonymous)

  override def isPermittedToUpdate(exam: Exam, user: User): Boolean =
    user.hasRole(Role.Name.ADMIN) || exam.isOwnedOrCreatedBy(user)

  override def isAllowedToUpdate(exam: Exam, user: User): Boolean =
    user.hasRole(Role.Name.ADMIN) || !hasFutureReservations(exam)

  override def isAllowedToRemove(exam: Exam): Boolean =
    !hasFutureReservations(exam) && !hasFutureEvents(exam) && exam.getChildren.isEmpty

  override def updateExamFeedbackConfig(exam: Exam, newConfig: ExamFeedbackConfig): Unit =
    val config = exam.getExamFeedbackConfig

    Option(newConfig) match
      case None =>
        // User wishes to disable the config
        Option(config).foreach { c =>
          c.delete()
          exam.setExamFeedbackConfig(null)
        }

      case Some(nc) =>
        val finalConfig = Option(config).getOrElse {
          val c = new ExamFeedbackConfig()
          c.setExam(exam)
          exam.setExamFeedbackConfig(c)
          c
        }

        finalConfig.setReleaseType(nc.getReleaseType)
        if finalConfig.getReleaseType == ExamFeedbackConfig.ReleaseType.GIVEN_DATE then
          finalConfig.setReleaseDate(nc.getReleaseDate)
        else finalConfig.setReleaseDate(null)

        finalConfig.save()
        exam.setExamFeedbackConfig(finalConfig)

  override def updateAutoEvaluationConfig(exam: Exam, newConfig: AutoEvaluationConfig): Unit =
    val config = exam.getAutoEvaluationConfig

    Option(newConfig) match
      case None =>
        // User wishes to disable the config
        Option(config).foreach { c =>
          c.delete()
          exam.setAutoEvaluationConfig(null)
        }

      case Some(nc) =>
        if exam.getExecutionType.getType != ExamExecutionType.Type.MATURITY.toString then
          val finalConfig = Option(config).getOrElse {
            val c = new AutoEvaluationConfig()
            c.setGradeEvaluations(new java.util.HashSet[GradeEvaluation]())
            c.setExam(exam)
            exam.setAutoEvaluationConfig(c)
            c
          }

          finalConfig.setReleaseType(nc.getReleaseType)
          finalConfig.getReleaseType match
            case AutoEvaluationConfig.ReleaseType.GIVEN_AMOUNT_DAYS =>
              finalConfig.setAmountDays(nc.getAmountDays)
              finalConfig.setReleaseDate(null)
            case AutoEvaluationConfig.ReleaseType.GIVEN_DATE =>
              finalConfig.setReleaseDate(nc.getReleaseDate)
              finalConfig.setAmountDays(null)
            case _ =>
              finalConfig.setReleaseDate(null)
              finalConfig.setAmountDays(null)

          finalConfig.save()
          updateGradeEvaluations(exam, nc)
          exam.setAutoEvaluationConfig(finalConfig)
        else logger.warn("Attempting to set auto evaluation config for maturity type. Refusing to do so")

  override def updateLanguage(exam: Exam, code: String, user: User): Option[Result] =
    if !isPermittedToUpdate(exam, user) then Some(Forbidden("i18n_error_access_forbidden"))
    else
      Option(DB.find(classOf[Language], code)).foreach { language =>
        if exam.getExamLanguages.contains(language) then exam.getExamLanguages.remove(language)
        else exam.getExamLanguages.add(language)
      }
      None

  override def preparePreview(exam: Exam): Unit =
    val questionsToHide = scala.collection.mutable.Set.empty[Question]

    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter(_.getQuestion.getType == Question.Type.ClozeTestQuestion)
      .foreach { esq =>
        val answer = new ClozeTestAnswer()
        answer.setQuestion(esq)
        esq.setClozeTestAnswer(answer)
        questionsToHide += esq.getQuestion
      }

    questionsToHide.foreach(_.setQuestion(null))
    exam.getExamSections.asScala.filter(_.isLotteryOn).foreach(_.shuffleQuestions())
    exam.setDerivedMaxScores()

  // Private helper methods

  private def updateGradeEvaluations(exam: Exam, newConfig: AutoEvaluationConfig): Unit =
    val config             = exam.getAutoEvaluationConfig
    val gradeMap           = config.asGradeMap.asScala.toMap
    val handledEvaluations = scala.collection.mutable.ListBuffer.empty[Int]
    val gs                 = Option(exam.getGradeScale).getOrElse(exam.getCourse.getGradeScale)

    // Handle proposed entries, persist new ones where necessary
    newConfig.getGradeEvaluations.asScala.foreach { src =>
      Option(DB.find(classOf[Grade], src.getGrade.getId)).foreach { grade =>
        if gs.getGrades.contains(grade) then
          val ge = gradeMap.getOrElse(
            grade.getId, {
              val newGe = new GradeEvaluation()
              newGe.setGrade(grade)
              newGe.setAutoEvaluationConfig(config)
              config.getGradeEvaluations.add(newGe)
              newGe
            }
          )
          ge.setPercentage(src.getPercentage)
          ge.save()
          handledEvaluations += grade.getId
        else throw new IllegalArgumentException("unknown grade")
      }
    }

    // Remove obsolete entries
    gradeMap
      .filterNot { case (key, _) => handledEvaluations.contains(key) }
      .foreach { case (_, value) =>
        value.delete()
        config.getGradeEvaluations.remove(value)
      }

  private def hasFutureReservations(exam: Exam): Boolean =
    val now = DateTime.now()
    exam.getExamEnrolments.asScala
      .map(_.getReservation)
      .exists(r => r != null && r.getEndAt.isAfter(now))

  private def hasFutureEvents(exam: Exam): Boolean =
    val now = DateTime.now()
    exam.getExamEnrolments.asScala
      .map(_.getExaminationEventConfiguration)
      .exists(eec => eec != null && eec.getExaminationEvent.getStart.isAfter(now))

  private def getFormValidationError(checkPeriod: Boolean, payload: Exam): Option[Result] =
    if !checkPeriod then None
    else
      val start = Option(payload.getPeriodStart)
      val end   = Option(payload.getPeriodEnd)

      (start, end) match
        case (None, _) =>
          Some(BadRequest("i18n_error_start_date"))
        case (_, None) =>
          Some(BadRequest("i18n_error_end_date"))
        case (Some(s), Some(e)) if s.isAfter(e) =>
          Some(BadRequest("i18n_error_end_sooner_than_start"))
        case _ =>
          None

  private def isNonRestrictingValidityChange(newDate: DateTime, exam: Exam, isStartDate: Boolean): Boolean =
    val oldDate = if isStartDate then exam.getPeriodStart else exam.getPeriodEnd
    if isStartDate then !oldDate.isBefore(newDate)
    else !newDate.isBefore(oldDate)

  private def updateGrading(exam: Exam, grading: Int): Unit =
    // Allow updating grading if allowed in settings or if the course does not restrict the setting
    val canOverrideGrading = configReader.isCourseGradeScaleOverridable
    if canOverrideGrading || exam.getCourse == null || exam.getCourse.getGradeScale == null then
      Option(DB.find(classOf[GradeScale]).fetch("grades").where().idEq(grading).findOne()) match
        case Some(scale) =>
          exam.setGradeScale(scale)
        case None =>
          logger.warn(s"Grade scale not found for ID $grading. Not gonna update exam with it")

  private def notifyParticipantsAboutPrivateExamPublication(exam: Exam, sender: User): Unit =
    val enrolments = exam.getExamEnrolments.asScala
      .map(_.getUser)
      .filter(_ != null)
      .toSet

    val preEnrolments = exam.getExamEnrolments.asScala
      .map(_.getPreEnrolledUserEmail)
      .filter(_ != null)
      .map { email =>
        val user = new User()
        user.setId(ThreadLocalRandom.current().nextLong()) // users are hashed based on id
        user.setEmail(email)
        user
      }
      .toSet

    val receivers = enrolments ++ preEnrolments

    actorSystem.scheduler.scheduleOnce(1.second) {
      receivers.foreach { u =>
        emailComposer.composePrivateExamParticipantNotification(u, sender, exam)
        logger.info(s"Exam participation notification email sent to ${u.getEmail}")
      }
    }(using actorSystem.dispatcher)
