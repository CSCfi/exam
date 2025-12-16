// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

import features.exam.copy.ExamCopyContext
import io.ebean._
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam._
import models.facility.{ExamMachine, Software}
import models.sections.ExamSection
import models.user._
import org.joda.time.{DateTime, LocalDate}
import play.api.Logging
import play.api.libs.json.JsValue
import services.config.{ByodConfigHandler, ConfigReader}
import services.exam.ExamUpdater
import services.user.UserHandler
import validation.exam.ExamValidator

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters._

class ExamService @Inject() (
    private val examUpdater: ExamUpdater,
    private val configReader: ConfigReader,
    private val byodConfigHandler: ByodConfigHandler,
    private val userHandler: UserHandler,
    implicit private val ec: ExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private def createPrototypeQuery(): ExpressionList[Exam] =
    DB.find(classOf[Exam])
      .fetch("course")
      .fetch("creator")
      .fetch("examOwners")
      .fetch("examInspections.user")
      .fetch("examSections")
      .fetch("executionType")
      .fetch("parent")
      .where()
      .or()
      .eq("state", Exam.State.PUBLISHED)
      .eq("state", Exam.State.SAVED)
      .eq("state", Exam.State.DRAFT)
      .endOr()

  def searchExams(filter: Option[String], user: User): List[Exam] =
    if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then getAllExams(filter)
    else getAllExamsOfTeacher(user)

  private def getAllExams(filter: Option[String]): List[Exam] =
    val baseQuery = createPrototypeQuery()
    val query = filter match
      case Some(f) =>
        val withOr         = baseQuery.or()
        val withNameSearch = userHandler.applyNameSearch("examOwners", withOr, f)
        val condition      = s"%$f%"
        withNameSearch.ilike("name", condition).ilike("course.code", condition).endOr()
      case None => baseQuery
    query.list

  private def getAllExamsOfTeacher(user: User): List[Exam] =
    createPrototypeQuery().eq("examOwners", user).orderBy("created").list

  def listPrintouts(): List[Exam] =
    DB.find(classOf[Exam])
      .where()
      .eq("executionType.type", ExamExecutionType.Type.PRINTOUT.toString)
      .eq("state", Exam.State.PUBLISHED)
      .ge("examinationDates.date", LocalDate.now())
      .list

  def listExams(
      user: User,
      courseIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): List[Exam] =
    val courses   = courseIds.getOrElse(Nil)
    val sections  = sectionIds.getOrElse(Nil)
    val tags      = tagIds.getOrElse(Nil)
    val owners    = ownerIds.getOrElse(Nil)
    val baseQuery = DB.find(classOf[Exam]).where().isNotNull("name").isNotNull("course").isNull("parent")
    val withOwnerFilter =
      if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then baseQuery.eq("examOwners", user)
      else baseQuery
    val withCourseFilter =
      if courses.nonEmpty then withOwnerFilter.in("course.id", courses.asJava)
      else withOwnerFilter
    val withSectionFilter =
      if sections.nonEmpty then withCourseFilter.in("examSections.id", sections.asJava)
      else withCourseFilter
    val withTagFilter =
      if tags.nonEmpty then withSectionFilter.in("examSections.sectionQuestions.question.parent.tags.id", tags.asJava)
      else withSectionFilter
    val el =
      if owners.nonEmpty then withTagFilter.in("questionOwners.id", user)
      else withTagFilter
    el.list

  def getTeachersExams(user: User): List[Exam] =
    val query = DB.createQuery(classOf[Exam])
    val props = PathProperties.parse(
      "(*, course(id, code), " +
        "children(id, state, examInspections(user(id, firstName, lastName))), " +
        "examinationDates(*), " +
        "examOwners(id, firstName, lastName), executionType(type), " +
        "examInspections(id, user(id, firstName, lastName)), " +
        "examEnrolments(id, user(id), reservation(id, endAt), examinationEventConfiguration(examinationEvent(start))))"
    )
    props.apply(query)
    query
      .where()
      .in("state", Exam.State.PUBLISHED, Exam.State.SAVED, Exam.State.DRAFT)
      .disjunction()
      .eq("examInspections.user", user)
      .eq("examOwners", user)
      .endJunction()
      .isNull("parent")
      .orderBy("created")
      .list

  def deleteExam(id: Long, user: User): Either[ExamError, Unit] =
    Option(DB.find(classOf[Exam], id)) match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) || exam.isOwnedOrCreatedBy(user) then
          if examUpdater.isAllowedToRemove(exam) then
            exam.setModifierWithDate(user)
            exam.setState(Exam.State.DELETED)
            exam.update()
            Right(())
          else Left(ExamError.ExamRemovalNotPossible)
        else Left(ExamError.AccessForbidden)

  def findExam(id: Long): Option[Exam] =
    prototypeQuery()
      .where()
      .idEq(id)
      .disjunction()
      .eq("state", Exam.State.DRAFT)
      .eq("state", Exam.State.SAVED)
      .eq("state", Exam.State.PUBLISHED)
      .endJunction()
      .find

  def getExam(id: Long, user: User): Either[ExamError, Exam] =
    findExam(id) match
      case None       => Left(ExamError.NotFound)
      case Some(exam) =>
        // decipher the passwords if any
        if exam.getImplementation == Exam.Implementation.CLIENT_AUTH then
          exam.getExaminationEventConfigurations.asScala.foreach { eec =>
            val plainTextSettingsPwd = byodConfigHandler.getPlaintextPassword(
              eec.getEncryptedSettingsPassword,
              eec.getSettingsPasswordSalt
            )
            eec.setSettingsPassword(plainTextSettingsPwd)
            Option(eec.getEncryptedQuitPassword).foreach { _ =>
              val plainTextQuitPwd = byodConfigHandler.getPlaintextPassword(
                eec.getEncryptedQuitPassword,
                eec.getQuitPasswordSalt
              )
              eec.setQuitPassword(plainTextQuitPwd)
            }
          }
        if exam.isShared || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole(
            Role.Name.ADMIN,
            Role.Name.SUPPORT
          )
        then
          exam.getExamSections.asScala.foreach { s =>
            s.setSectionQuestions(new java.util.TreeSet(s.getSectionQuestions))
          }
          Right(exam)
        else Left(ExamError.AccessForbidden)

  def getExamTypes(): List[ExamType] =
    DB.find(classOf[ExamType]).where().ne("deprecated", true).list

  def getExamGradeScales(): List[GradeScale] =
    DB.find(classOf[GradeScale]).fetch("grades").list

  def getExamExecutionTypes(): List[ExamExecutionType] =
    DB.find(classOf[ExamExecutionType]).where().ne("active", false).list

  def getExamPreview(id: Long, user: User): Either[ExamError, Exam] =
    DB.find(classOf[Exam])
      .fetch("course")
      .fetch("executionType")
      .fetch("examinationDates")
      .fetch("examLanguages")
      .fetch("examSections")
      .fetch("examSections.examMaterials")
      .fetch("examSections.sectionQuestions", FetchConfig.ofQuery())
      .fetch("examSections.sectionQuestions.question")
      .fetch("examSections.sectionQuestions.question.attachment")
      .fetch("examSections.sectionQuestions.options")
      .fetch("examSections.sectionQuestions.options.option")
      .fetch("examSections.sectionQuestions.clozeTestAnswer")
      .fetch("attachment")
      .fetch("creator")
      .fetch("examOwners")
      .where()
      .idEq(id)
      .find match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        if exam.isShared || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole(
            Role.Name.ADMIN,
            Role.Name.SUPPORT
          )
        then
          examUpdater.preparePreview(exam)
          Right(exam)
        else Left(ExamError.AccessForbidden)

  def updateExam(id: Long, user: User, payload: JsValue): Either[ExamError, Exam] =
    prototypeQuery().where().idEq(id).find match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        ExamValidator.forUpdate(payload) match
          case Left(ex) => Left(ExamError.ValidationError(ex.getMessage))
          case Right(validatedPayload) =>
            if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
              val result = examUpdater
                .updateTemporalFieldsAndValidate(exam, user, validatedPayload)
                .getOrElse(
                  examUpdater
                    .updateStateAndValidate(exam, user, validatedPayload)
                    .getOrElse(handleExamUpdate(exam, user, validatedPayload))
                )
              if result.header.status == play.api.http.Status.OK then Right(exam)
              else Left(ExamError.UpdateError(result))
            else Left(ExamError.AccessForbidden)

  private def handleExamUpdate(exam: Exam, user: User, payload: Exam): play.api.mvc.Result =
    val grading           = Option(payload.getGrade).map(_.getId)
    val gradeScaleChanged = grading.exists(didGradeChange(exam, _))
    val loginRole         = user.getLoginRole
    examUpdater.update(exam, payload, loginRole)
    if gradeScaleChanged then
      Option(exam.getAutoEvaluationConfig).foreach { config =>
        config.delete()
        exam.setAutoEvaluationConfig(null)
      }
    else
      // Always call update method - it handles null (removal) correctly
      examUpdater.updateAutoEvaluationConfig(exam, payload.getAutoEvaluationConfig)
    // Always call update method - it handles null (removal) correctly
    examUpdater.updateExamFeedbackConfig(exam, payload.getExamFeedbackConfig)
    exam.save()
    play.api.mvc.Results.Ok(exam.asJson)

  private def didGradeChange(exam: Exam, grading: Int): Boolean =
    val canOverrideGrading = configReader.isCourseGradeScaleOverridable
    if canOverrideGrading || Option(exam.getCourse.getGradeScale).isEmpty then
      DB.find(classOf[GradeScale]).fetch("grades").where().idEq(grading).find match
        case None => false
        case Some(scale) =>
          Option(exam.getGradeScale).isEmpty || !exam.getGradeScale.equals(scale)
    else false

  def updateExamSoftware(eid: Long, sid: Long, user: User): Either[ExamError, Unit] =
    Option(DB.find(classOf[Exam], eid)) match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        if !examUpdater.isPermittedToUpdate(exam, user) then Left(ExamError.AccessForbidden)
        else
          Option(DB.find(classOf[Software], sid)) match
            case None => Left(ExamError.NotFound)
            case Some(software) =>
              if exam.getSoftwareInfo.contains(software) then
                exam.getSoftwareInfo.remove(software)
                exam.update()
                Right(())
              else
                exam.getSoftwareInfo.add(software)
                if !softwareRequirementDoable(exam) then Left(ExamError.NoRequiredSoftwares)
                else
                  exam.update()
                  Right(())

  private def softwareRequirementDoable(exam: Exam): Boolean =
    val machines = DB.find(classOf[ExamMachine]).where().eq("archived", false).list
    machines.exists { m =>
      val machineSoftware = m.getSoftwareInfo.asScala.toSet
      val examSoftware    = exam.getSoftwareInfo.asScala.toSet
      examSoftware.subsetOf(machineSoftware)
    }

  def updateExamLanguage(eid: Long, code: String, user: User): Either[ExamError, Unit] =
    Option(DB.find(classOf[Exam], eid)) match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        examUpdater.updateLanguage(exam, code, user) match
          case Some(errorResult) => Left(ExamError.UpdateError(errorResult))
          case None =>
            exam.update()
            Right(())

  def copyExam(
      id: Long,
      user: User,
      examinationType: Option[String],
      executionTypeStr: Option[String]
  ): Either[ExamError, Exam] =
    (examinationType, executionTypeStr) match
      case (Some(examType), Some(execType)) =>
        if Exam.Implementation.valueOf(examType) != Exam.Implementation.AQUARIUM &&
          !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
        then Left(ExamError.NoPermissionToCreateByodExam)
        else
          val pp = PathProperties.parse(
            "(" +
              "*, " +
              "examType(id, type), " +
              "examSections(id, name, sequenceNumber, " +
              "sectionQuestions(*, " +
              "question(id, type, question, attachment(fileName)), " +
              "options(*, option(id, option)))), " +
              "examLanguages(code), " +
              "attachment(fileName), " +
              "examOwners(firstName, lastName), " +
              "examInspections(*, user(firstName, lastName)), " +
              "softwares(*)" +
              ")"
          )
          val query = DB.find(classOf[Exam])
          pp.apply(query)
          query.where().idEq(id).find match
            case None => Left(ExamError.NotFound)
            case Some(prototype) =>
              DB.find(classOf[ExamExecutionType]).where().eq("type", execType).find match
                case None                => Left(ExamError.ExecutionTypeNotFound)
                case Some(executionType) =>
                  // No sense in copying the AE config if grade scale is fixed to course (that will initially be NULL for a copy)
                  if Option(
                      prototype.getAutoEvaluationConfig
                    ).isDefined && !configReader.isCourseGradeScaleOverridable
                  then prototype.setAutoEvaluationConfig(null)
                  val context = ExamCopyContext.forTeacherCopy(user).build()
                  val copy    = prototype.createCopy(context)
                  copy.setName(s"**COPY**${copy.getName}")
                  copy.setState(Exam.State.DRAFT)
                  copy.setExecutionType(executionType)
                  copy.setImplementation(Exam.Implementation.valueOf(examType))
                  copy.setCreatorWithDate(user)
                  copy.setParent(null)
                  copy.setCourse(null)
                  copy.setExamFeedbackConfig(null)
                  copy.setSubjectToLanguageInspection(null)
                  val now = DateTime.now().withTimeAtStartOfDay()
                  copy.setPeriodStart(now)
                  copy.setPeriodEnd(now.plusDays(1))
                  // Force anonymous review if globally enabled for public examinations
                  if !copy.isPrivate then copy.setAnonymous(false)
                  else if configReader.isAnonymousReviewEnabled then copy.setAnonymous(true)
                  copy.setGradingType(Grade.Type.GRADED)
                  copy.save()
                  Right(copy)
      case _ => Left(ExamError.ValidationError("Missing examinationType or type"))

  def createExamDraft(user: User, payload: JsValue): Either[ExamError, Long] =
    ExamValidator.forCreation(payload) match
      case Left(ex) => Left(ExamError.ValidationError(ex.getMessage))
      case Right(validatedPayload) =>
        val executionType  = validatedPayload.getExecutionType.getType
        val implementation = validatedPayload.getImplementation.toString
        DB.find(classOf[ExamExecutionType])
          .where()
          .eq("type", executionType)
          .find match
          case None => Left(ExamError.UnsupportedExecutionType)
          case Some(examExecutionType) =>
            if Exam.Implementation.valueOf(implementation) != Exam.Implementation.AQUARIUM &&
              !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
            then Left(ExamError.NoPermissionToCreateByodExam)
            else
              val exam = new Exam()
              exam.generateHash()
              exam.setState(Exam.State.DRAFT)
              exam.setImplementation(Exam.Implementation.valueOf(implementation))
              exam.setExecutionType(examExecutionType)
              if ExamExecutionType.Type.PUBLIC.toString == examExecutionType.getType then
                exam.setAnonymous(configReader.isAnonymousReviewEnabled)
              exam.setCreatorWithDate(user)
              exam.setGradingType(Grade.Type.GRADED)
              exam.save()

              val examSection = new ExamSection()
              examSection.setCreatorWithDate(user)
              examSection.setExam(exam)
              examSection.setExpanded(true)
              examSection.setSequenceNumber(0)
              examSection.save()

              exam.getExamSections.add(examSection)
              exam.getExamLanguages.add(DB.find(classOf[Language], "fi")) // TODO: configurable?
              exam.setExamType(DB.find(classOf[ExamType], 2))             // Final

              val start = DateTime.now().withTimeAtStartOfDay()
              if !exam.isPrintout then
                exam.setPeriodStart(start)
                exam.setPeriodEnd(start.plusDays(1))
              exam.setDuration(configReader.getExamDurationsJava.asScala.head)
              if configReader.isCourseGradeScaleOverridable then
                exam.setGradeScale(DB.find(classOf[GradeScale]).list.head)

              exam.save()

              exam.getExamOwners.add(user)
              exam.setTrialCount(1)

              exam.save()

              Right(exam.getId)

  def updateCourse(eid: Long, cid: Long, user: User): Either[ExamError, Unit] =
    Option(DB.find(classOf[Exam], eid)) match
      case None => Left(ExamError.NotFound)
      case Some(exam) =>
        if !examUpdater.isAllowedToUpdate(exam, user) then Left(ExamError.FutureReservationsExist)
        else if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          Option(DB.find(classOf[models.exam.Course], cid)) match
            case None => Left(ExamError.NotFound)
            case Some(course) =>
              Option(course.getStartDate) match
                case Some(startDate) =>
                  val validity = configReader.getCourseValidityDate(new DateTime(startDate))
                  if validity.isAfterNow then Left(ExamError.CourseNotActive)
                  else
                    Option(course.getEndDate) match
                      case Some(endDate) if endDate.before(new java.util.Date()) =>
                        Left(ExamError.CourseNotActive)
                      case _ =>
                        exam.setCourse(course)
                        exam.save()
                        Right(())
                case None =>
                  Option(course.getEndDate) match
                    case Some(endDate) if endDate.before(new java.util.Date()) =>
                      Left(ExamError.CourseNotActive)
                    case _ =>
                      exam.setCourse(course)
                      exam.save()
                      Right(())
        else Left(ExamError.AccessForbidden)

  private def prototypeQuery(): Query[Exam] =
    DB.find(classOf[Exam])
      .fetch("course")
      .fetch("course.organisation")
      .fetch("course.gradeScale")
      .fetch("course.gradeScale.grades", FetchConfig.ofQuery())
      .fetch("examType")
      .fetch("autoEvaluationConfig")
      .fetch("autoEvaluationConfig.gradeEvaluations", FetchConfig.ofQuery())
      .fetch("examFeedbackConfig")
      .fetch("executionType")
      .fetch("examinationDates")
      .fetch("examinationEventConfigurations")
      .fetch("examinationEventConfigurations.examEnrolments")
      .fetch("examinationEventConfigurations.examinationEvent")
      .fetch("examSections")
      .fetch(
        "examSections.sectionQuestions",
        "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType"
      )
      .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
      .fetch("examSections.sectionQuestions.question.attachment", "fileName")
      .fetch("examSections.sectionQuestions.options", FetchConfig.ofQuery())
      .fetch(
        "examSections.sectionQuestions.options.option",
        "id, option, correctOption, defaultScore, claimChoiceType"
      )
      .fetch("examSections.examMaterials")
      .fetch("gradeScale")
      .fetch("gradeScale.grades")
      .fetch("grade")
      .fetch("examEnrolments", "preEnrolledUserEmail")
      .fetch("examEnrolments.user")
      .fetch("examEnrolments.reservation", "endAt")
      .fetch("children", "id")
      .fetch("children.examEnrolments", "id")
      .fetch("children.examEnrolments.user", "firstName, lastName, userIdentifier, email")
      .fetch("children.examParticipation", "id")
      .fetch("children.examParticipation.user", "firstName, lastName, userIdentifier, email")
      .fetch("creditType")
      .fetch("attachment")
      .fetch("softwares")
      .fetch("examLanguages")
      .fetch("examOwners")
