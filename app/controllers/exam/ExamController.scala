// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam

import controllers.base.AnonymousHandler
import controllers.exam.copy.ExamCopyContext
import impl.ExamUpdater
import io.ebean.{DB, ExpressionList, FetchConfig, Query}
import io.ebean.text.PathProperties
import miscellaneous.config.{ByodConfigHandler, ConfigReader}
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import miscellaneous.user.UserHandler
import models.exam.*
import models.facility.{ExamMachine, Software}
import models.sections.ExamSection
import models.user.{Language, Permission, Role, User}
import org.joda.time.{DateTime, LocalDate}
import play.api.Logging
import play.api.libs.json.{JsNumber, JsValue, Json}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}
import system.interceptors.scala.AnonymousJsonFilter
import validation.scala.exam.ExamValidator

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class ExamController @Inject() (
    examUpdater: ExamUpdater,
    configReader: ConfigReader,
    byodConfigHandler: ByodConfigHandler,
    userHandler: UserHandler,
    authenticated: AuthenticatedAction,
    anonymousJsonFilter: AnonymousJsonFilter,
    override val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext, mat: org.apache.pekko.stream.Materializer)
    extends play.api.mvc.BaseController
    with DbApiHelper
    with JavaApiHelper
    with AnonymousHandler
    with Logging:

  override protected def executionContext: ExecutionContext                 = ec
  override protected def materializer: org.apache.pekko.stream.Materializer = mat

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

  private def getAllExams(filter: Option[String]): List[Exam] =
    var query = createPrototypeQuery()
    filter match
      case Some(f) =>
        query = query.or()
        query = userHandler.applyNameSearch("examOwners", query, f)
        val condition = s"%$f%"
        query = query.ilike("name", condition).ilike("course.code", condition).endOr()
      case None => ()
    query.list

  private def getAllExamsOfTeacher(user: User): List[Exam] =
    createPrototypeQuery().eq("examOwners", user).orderBy("created").list

  def searchExams(filter: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      val exams =
        if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then getAllExams(filter)
        else getAllExamsOfTeacher(user)
      Future.successful(Ok(exams.asJson))
    }

  def listPrintouts(): Action[AnyContent] =
    Action { _ =>
      val printouts = DB
        .find(classOf[Exam])
        .where()
        .eq("executionType.type", ExamExecutionType.Type.PRINTOUT.toString)
        .eq("state", Exam.State.PUBLISHED)
        .ge("examinationDates.date", LocalDate.now())
        .list
      val pp = PathProperties.parse(
        "(id, name, course(code), examinationDates(date), examOwners(firstName, lastName))"
      )
      Ok(printouts.asJson(pp))
    }

  def listExams(
      courseIds: Option[List[Long]],
      sectionIds: Option[List[Long]],
      tagIds: Option[List[Long]],
      ownerIds: Option[List[Long]]
  ): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      val user     = request.attrs(Auth.ATTR_USER)
      val courses  = courseIds.getOrElse(Nil)
      val sections = sectionIds.getOrElse(Nil)
      val tags     = tagIds.getOrElse(Nil)
      val owners   = ownerIds.getOrElse(Nil)
      val pp = PathProperties.parse(
        "(id, name, examActiveStartDate, examActiveEndDate, course(id, code), examSections(id, name))"
      )
      val query = DB.find(classOf[Exam])
      pp.apply(query)
      var el = query.where().isNotNull("name").isNotNull("course").isNull("parent")
      if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then el = el.eq("examOwners", user)
      if courses.nonEmpty then el = el.in("course.id", courses.asJava)
      if sections.nonEmpty then el = el.in("examSections.id", sections.asJava)
      if tags.nonEmpty then el = el.in("examSections.sectionQuestions.question.parent.tags.id", tags.asJava)
      if owners.nonEmpty then el = el.in("questionOwners.id", user)
      Future.successful(Ok(el.list.asJson(pp)))
    }

  def getTeachersExams: Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER))).async { request =>
      val props = PathProperties.parse(
        "(*, course(id, code), " +
          "children(id, state, examInspections(user(id, firstName, lastName))), " +
          "examinationDates(*), " +
          "examOwners(id, firstName, lastName), executionType(type), " +
          "examInspections(id, user(id, firstName, lastName)), " +
          "examEnrolments(id, user(id), reservation(id, endAt), examinationEventConfiguration(examinationEvent(start))))"
      )
      val query = DB.createQuery(classOf[Exam])
      props.apply(query)
      val user = request.attrs(Auth.ATTR_USER)
      val exams = query
        .where()
        .in("state", Exam.State.PUBLISHED, Exam.State.SAVED, Exam.State.DRAFT)
        .disjunction()
        .eq("examInspections.user", user)
        .eq("examOwners", user)
        .endJunction()
        .isNull("parent")
        .orderBy("created")
        .list
      Future.successful(Ok(exams.asJson(props)))
    }

  def deleteExam(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      Option(DB.find(classOf[Exam], id)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) || exam.isOwnedOrCreatedBy(user) then
            if examUpdater.isAllowedToRemove(exam) then
              exam.setModifierWithDate(user)
              exam.setState(Exam.State.DELETED)
              exam.update()
              Future.successful(Ok)
            else Future.successful(Forbidden("i18n_exam_removal_not_possible"))
          else Future.successful(Forbidden("i18n_error_access_forbidden"))
    }

  private def findExam(id: Long): Option[Exam] =
    prototypeQuery()
      .where()
      .idEq(id)
      .disjunction()
      .eq("state", Exam.State.DRAFT)
      .eq("state", Exam.State.SAVED)
      .eq("state", Exam.State.PUBLISHED)
      .endJunction()
      .find

  def getExam(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(anonymousJsonFilter.apply(Set("user")))
      .async { request =>
        findExam(id) match
          case None       => Future.successful(NotFound("i18n_error_exam_not_found"))
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
            val user = request.attrs(Auth.ATTR_USER)
            if exam.isShared || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole(
                Role.Name.ADMIN,
                Role.Name.SUPPORT
              )
            then
              exam.getExamSections.asScala.foreach { s =>
                s.setSectionQuestions(new java.util.TreeSet(s.getSectionQuestions))
              }
              Future.successful(writeAnonymousResult(request, Ok(exam.asJson), exam.isAnonymous))
            else Future.successful(Forbidden("i18n_error_access_forbidden"))
      }

  def getExamTypes: Action[AnyContent] =
    Action { _ =>
      val types = DB.find(classOf[ExamType]).where().ne("deprecated", true).list
      Ok(types.asJson)
    }

  def getExamGradeScales: Action[AnyContent] =
    Action { _ =>
      val scales = DB.find(classOf[GradeScale]).fetch("grades").list
      Ok(scales.asJson)
    }

  def getExamExecutionTypes: Action[AnyContent] =
    Action { _ =>
      val types = DB.find(classOf[ExamExecutionType]).where().ne("active", false).list
      Ok(types.asJson)
    }

  def getExamPreview(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
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
          .find
      match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if exam.isShared || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole(
              Role.Name.ADMIN,
              Role.Name.SUPPORT
            )
          then
            examUpdater.preparePreview(exam)
            Future.successful(Ok(exam.asJson))
          else Future.successful(Forbidden("i18n_error_access_forbidden"))
    }

  private def handleExamUpdate(exam: Exam, user: User, payload: Exam): Result =
    val grading           = Option(payload.getGrade).map(_.getId)
    val gradeScaleChanged = grading.exists(didGradeChange(exam, _))
    val loginRole         = user.getLoginRole
    examUpdater.update(exam, payload, loginRole)
    if gradeScaleChanged then
      Option(exam.getAutoEvaluationConfig).foreach { config =>
        config.delete()
        exam.setAutoEvaluationConfig(null)
      }
    else Option(payload.getAutoEvaluationConfig).foreach(examUpdater.updateAutoEvaluationConfig(exam, _))
    Option(payload.getExamFeedbackConfig).foreach(examUpdater.updateExamFeedbackConfig(exam, _))
    exam.save()
    Ok(exam.asJson)

  def updateExam(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        prototypeQuery().where().idEq(id).find match
          case None => Future.successful(NotFound)
          case Some(exam) =>
            val user = request.attrs(Auth.ATTR_USER)
            ExamValidator.forUpdate(request.body) match
              case Left(ex) => Future.successful(BadRequest(ex.getMessage))
              case Right(payload) =>
                if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
                  val result = examUpdater
                    .updateTemporalFieldsAndValidate(exam, user, payload)
                    .getOrElse(
                      examUpdater
                        .updateStateAndValidate(exam, user, payload)
                        .getOrElse(handleExamUpdate(exam, user, payload))
                    )
                  Future.successful(result)
                else Future.successful(Forbidden("i18n_error_access_forbidden"))
      }

  private def didGradeChange(exam: Exam, grading: Int): Boolean =
    val canOverrideGrading = configReader.isCourseGradeScaleOverridable
    if canOverrideGrading || exam.getCourse.getGradeScale == null then
      DB.find(classOf[GradeScale]).fetch("grades").where().idEq(grading).find match
        case None => false
        case Some(scale) =>
          exam.getGradeScale == null || !exam.getGradeScale.equals(scale)
    else false

  def updateExamSoftware(eid: Long, sid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      Option(DB.find(classOf[Exam], eid)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !examUpdater.isPermittedToUpdate(exam, user) then
            Future.successful(Forbidden("i18n_error_access_forbidden"))
          else
            Option(DB.find(classOf[Software], sid)) match
              case None => Future.successful(NotFound)
              case Some(software) =>
                if exam.getSoftwareInfo.contains(software) then
                  exam.getSoftwareInfo.remove(software)
                  exam.update()
                  Future.successful(Ok)
                else
                  exam.getSoftwareInfo.add(software)
                  if !softwareRequirementDoable(exam) then Future.successful(BadRequest("i18n_no_required_softwares"))
                  else
                    exam.update()
                    Future.successful(Ok)
    }

  private def softwareRequirementDoable(exam: Exam): Boolean =
    val machines = DB.find(classOf[ExamMachine]).where().eq("archived", false).list
    machines.exists { m =>
      val machineSoftware = m.getSoftwareInfo.asScala.toSet
      val examSoftware    = exam.getSoftwareInfo.asScala.toSet
      examSoftware.subsetOf(machineSoftware)
    }

  def updateExamLanguage(eid: Long, code: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      Option(DB.find(classOf[Exam], eid)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          examUpdater.updateLanguage(exam, code, user) match
            case Some(errorResult) => Future.successful(errorResult)
            case None =>
              exam.update()
              Future.successful(Ok)
    }

  def copyExam(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      val user             = request.attrs(Auth.ATTR_USER)
      val formData         = request.body.asFormUrlEncoded.getOrElse(Map.empty)
      val examinationType  = formData.get("examinationType").flatMap(_.headOption)
      val executionTypeStr = formData.get("type").flatMap(_.headOption)

      (examinationType, executionTypeStr) match
        case (Some(examType), Some(execType)) =>
          if Exam.Implementation.valueOf(examType) != Exam.Implementation.AQUARIUM &&
            !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
          then Future.successful(Forbidden("i18n_access_forbidden"))
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
              case None => Future.successful(NotFound("i18n_exam_not_found"))
              case Some(prototype) =>
                DB.find(classOf[ExamExecutionType]).where().eq("type", execType).find match
                  case None                => Future.successful(NotFound("i18n_execution_type_not_found"))
                  case Some(executionType) =>
                    // No sense in copying the AE config if grade scale is fixed to course (that will initially be NULL for a copy)
                    if prototype.getAutoEvaluationConfig != null && !configReader.isCourseGradeScaleOverridable then
                      prototype.setAutoEvaluationConfig(null)
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
                    Future.successful(Ok(copy.asJson))
        case _ => Future.successful(BadRequest("Missing examinationType or type"))
    }

  def createExamDraft(): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .async(parse.json) { request =>
        ExamValidator.forCreation(request.body) match
          case Left(ex) => Future.successful(BadRequest(ex.getMessage))
          case Right(payload) =>
            val executionType  = payload.getExecutionType.getType
            val implementation = payload.getImplementation.toString
              DB.find(classOf[ExamExecutionType])
                .where()
                .eq("type", executionType)
                .find
            match
              case None => Future.successful(BadRequest("Unsupported execution type"))
              case Some(examExecutionType) =>
                val user = request.attrs(Auth.ATTR_USER)
                if Exam.Implementation.valueOf(implementation) != Exam.Implementation.AQUARIUM &&
                  !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
                then Future.successful(Forbidden("No permission to create home examinations"))
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

                  Future.successful(Ok(Json.obj("id" -> JsNumber(BigDecimal(exam.getId)))))
      }

  def updateCourse(eid: Long, cid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))).async { request =>
      Option(DB.find(classOf[Exam], eid)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !examUpdater.isAllowedToUpdate(exam, user) then
            Future.successful(Forbidden("i18n_error_future_reservations_exist"))
          else if exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
            Option(DB.find(classOf[Course], cid)) match
              case None => Future.successful(NotFound("i18n_error_not_found"))
              case Some(course) =>
                Option(course.getStartDate) match
                  case Some(startDate) =>
                    val validity = configReader.getCourseValidityDate(new DateTime(startDate))
                    if validity.isAfterNow then Future.successful(Forbidden("i18n_error_course_not_active"))
                    else
                      Option(course.getEndDate) match
                        case Some(endDate) if endDate.before(new java.util.Date()) =>
                          Future.successful(Forbidden("i18n_error_course_not_active"))
                        case _ =>
                          exam.setCourse(course)
                          exam.save()
                          Future.successful(Ok)
                  case None =>
                    Option(course.getEndDate) match
                      case Some(endDate) if endDate.before(new java.util.Date()) =>
                        Future.successful(Forbidden("i18n_error_course_not_active"))
                      case _ =>
                        exam.setCourse(course)
                        exam.save()
                        Future.successful(Ok)
          else Future.successful(Forbidden("i18n_error_access_forbidden"))
    }

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
