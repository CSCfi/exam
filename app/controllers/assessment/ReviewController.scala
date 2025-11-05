// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.assessment

import controllers.base.scala.ExamBaseController
import impl.mail.EmailComposer
import io.ebean.text.PathProperties
import io.ebean.{DB, Query}
import miscellaneous.file.FileHandler
import miscellaneous.scala.DbApiHelper
import models.assessment.*
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamType, Grade}
import models.questions.{ClozeTestAnswer, EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Permission, Role, User}
import org.apache.pekko.actor.ActorSystem
import org.joda.time.DateTime
import play.api.Logging
import play.api.i18n.{Lang, MessagesApi}
import play.api.libs.json.*
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import security.scala.{Auth, AuthExecutionContext}
import system.AuditedAction
import system.interceptors.scala.AnonymousJsonFilter
import validation.scala.core.{ScalaAttrs, Validators}
import validation.scala.{CommaJoinedListValidator, CommentValidator}

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ReviewController @Inject() (
    val controllerComponents: ControllerComponents,
    val validators: Validators,
    val authenticated: AuthenticatedAction,
    val audited: AuditedAction,
    val anonymous: AnonymousJsonFilter,
    val emailComposer: EmailComposer,
    val fileHandler: FileHandler,
    val actorSystem: ActorSystem,
    val messaging: MessagesApi,
    implicit val ec: AuthExecutionContext
) extends BaseController
    with ExamBaseController
    with DbApiHelper
    with Logging:

  def listParticipationsForExamAndUser(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail", "grade"))) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            val participations = DB
              .find(classOf[ExamParticipation])
              .fetch("exam", "id, state, anonymous")
              .fetch("exam.grade", "id, name")
              .where()
              .eq("user", exam.getCreator)
              .eq("exam.parent", exam.getParent)
              .or()
              .eq("exam.state", Exam.State.ABORTED)
              .eq("exam.state", Exam.State.GRADED)
              .eq("exam.state", Exam.State.GRADED_LOGGED)
              .eq("exam.state", Exam.State.ARCHIVED)
              .endOr()
              .list
            writeAnonymousResult(request, Ok(participations.asJson), exam.isAnonymous)
          case None => NotFound("No exam with id " + eid + " found")
      }

  def listNoShowsForExamAndUser(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail"))) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            val enrolments = DB
              .find(classOf[ExamEnrolment])
              .fetch("reservation", "startAt, endAt")
              .fetch("examinationEventConfiguration.examinationEvent", "start")
              .where()
              .eq("user", exam.getCreator)
              .eq("exam", exam.getParent)
              .eq("noShow", true)
              .orderBy("reservation.endAt")
              .distinct
            writeAnonymousResult(request, Ok(enrolments.asJson), exam.isAnonymous)
          case None => NotFound
      }

  def getReview(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail", "creator", "modifier", "reservation"))) { request =>
        val user    = request.attrs(Auth.ATTR_USER)
        val isAdmin = user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        val states = Set(
          Exam.State.REVIEW,
          Exam.State.REVIEW_STARTED,
          Exam.State.GRADED,
          Exam.State.GRADED_LOGGED,
          Exam.State.REJECTED,
          Exam.State.ARCHIVED
        )
        createQuery()
          .where()
          .eq("exam.id", eid)
          .in("exam.state", if isAdmin then (states + Exam.State.ABORTED).asJava else states.asJava)
          .find match
          case Some(participation) =>
            val exam = participation.getExam
            if !exam.isChildInspectedOrCreatedOrOwnedBy(user) && !isAdmin && !exam.isViewableForLanguageInspector(user)
            then Forbidden("i18n_error_access_forbidden")
            else
              val blankAnswerText = messaging("clozeTest.blank.answer")(using Lang.get(user.getLanguage.getCode).get)
              exam.getExamSections.asScala
                .flatMap(es => es.getSectionQuestions.asScala)
                .filter(esq => esq.getQuestion.getType == Question.Type.ClozeTestQuestion)
                .foreach(esq =>
                  if Option(esq.getClozeTestAnswer).isEmpty then
                    val cta = new ClozeTestAnswer
                    cta.save()
                    esq.setClozeTestAnswer(cta)
                    esq.update()
                  esq.getClozeTestAnswer.setQuestionWithResults(esq, blankAnswerText, true)
                )
              writeAnonymousResult(request, Ok(participation.asJson), exam.isAnonymous);
          case None => NotFound("No exam with id " + eid + " found")

      }

  def listReviews(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "creator", "modifier"))) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        val pp = PathProperties.parse(
          "(" +
            "id, name, anonymous, state, gradedTime, customCredit, creditType, gradingType(*), answerLanguage, trialCount, " +
            "implementation, gradeScale(grades(*)), creditType(*), examType(*), executionType(*), examFeedback(*), grade(*), " +
            "course(code, name, gradeScale(grades(*))), " +
            "examSections(name, sectionQuestions(*, clozeTestAnswer(*), question(*), essayAnswer(*), options(*, option(*)))), " +
            "languageInspection(*), examLanguages(*), examFeedback(*), grade(name), " +
            "parent(name, periodStart, periodEnd, course(code, name), examOwners(firstName, lastName, email), examInspections(id, user(firstName, lastName)))" +
            "examParticipation(*, user(id, firstName, lastName, email, userIdentifier)), " +
            "examEnrolments(retrialPermitted)," +
            ")"
        )
        var el = DB
          .find(classOf[Exam])
          .where()
          .apply(pp)
          .where
          .eq("parent.id", eid)
          .in(
            "state",
            Exam.State.ABORTED,
            Exam.State.REVIEW,
            Exam.State.REVIEW_STARTED,
            Exam.State.GRADED,
            Exam.State.GRADED_LOGGED,
            Exam.State.REJECTED,
            Exam.State.ARCHIVED
          )
        if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
          el = el.or.eq("parent.examOwners", user).eq("examInspections.user", user).endOr
        val exams   = el.distinct
        val anonIds = exams.filter(_.isAnonymous).map(_.getExamParticipation.getId.longValue)

        // Set calculated fields on exams
        exams.foreach { e =>
          e.setMaxScore()
          e.setApprovedAnswerCount()
          e.setRejectedAnswerCount()
          e.setTotalScore()
        }

        // Get participations and build JSON manually to include exam (which has @JsonBackReference)
        val participations: Seq[JsValue] = exams.map { e =>
          val ep = e.getExamParticipation
          Json.obj(
            "id"            -> ep.getId.longValue,
            "started"       -> Option(ep.getStarted).map(_.getMillis),
            "ended"         -> Option(ep.getEnded).map(_.getMillis),
            "duration"      -> Option(ep.getDuration).map(_.getMillis),
            "deadline"      -> Option(ep.getDeadline).map(_.getMillis),
            "sentForReview" -> Option(ep.getSentForReview).map(_.getMillis),
            "user"          -> Option(ep.getUser).map(_.asJson),
            "exam"          -> e.asJson // Now uses JavaApiHelper with Joda module
          )
        }.toSeq

        writeAnonymousResult(request, Ok(Json.toJson(participations)), anonIds)
      }

  def scoreExamQuestion(id: Long): Action[JsValue] =
    Action
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        Option(DB.find(classOf[ExamSectionQuestion], id)) match
          case Some(question) =>
            val essayAnswer = Option(question.getEssayAnswer) match
              case Some(answer) => answer
              case None =>
                val answer = new EssayAnswer
                answer.save()
                question.setEssayAnswer(answer)
                question.update()
                answer
            val score = (request.body \ "evaluatedScore").asOpt[Double]
            essayAnswer.setEvaluatedScore(round(score.fold(null: java.lang.Double)(Double.box)))
            essayAnswer.update()
            Ok
          case None => BadRequest
      }

  def forceScoreExamQuestion(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        val user = request.attrs(Auth.ATTR_USER)
        DB.find(classOf[ExamSectionQuestion])
          .fetch("examSection.exam.parent.examOwners")
          .where()
          .idEq(id)
          .ne("question.type", Question.Type.EssayQuestion)
          .find match
          case Some(esq) =>
            val exam = esq.getExamSection.getExam
            if isDisallowedToScore(exam, user) then Forbidden("No permission to update scoring of this exam")
            if exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
            then Forbidden("Not allowed to update scoring of this exam")
            val score = (request.body \ "forcedScore").asOpt[Double]
            if score.isDefined && (score.get < esq.getMinScore || score.get > esq.getMaxAssessedScore) then Forbidden
            else
              esq.setForcedScore(round(score.fold(null: java.lang.Double)(Double.box)))
              esq.update()
              Ok
          case None => NotFound
      }

  def updateAssessmentInfo(id: Long): Action[JsValue] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER)))(parse.json).andThen(audited) { request =>
      val info = (request.body \ "assessmentInfo").asOpt[String]
      DB.find(classOf[Exam])
        .fetch("parent.creator")
        .where()
        .idEq(id)
        .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
        .find match
        case Some(exam) =>
          val user = request.attrs(Auth.ATTR_USER)
          if !exam.hasState(Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
            isDisallowedToModify(exam, user, exam.getState)
          then Forbidden("You are not allowed to modify this object")
          exam.setAssessmentInfo(info.orNull)
          exam.update()
          Ok
        case None => NotFound
    }

  def reviewExam(id: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(audited)(parse.json) { request =>
        DB.find(classOf[Exam]).fetch("parent").fetch("parent.creator").where.idEq(id).find match
          case Some(exam) =>
            val user     = request.attrs(Auth.ATTR_USER)
            val newState = Exam.State.valueOf((request.body \ "state").asOpt[String].orNull)
            if isDisallowedToModify(exam, user, newState)
            then Forbidden("You are not allowed to modify this object")
            if exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
            then Forbidden("Not allowed to update grading of this exam")
            if isRejectedInLanguageInspection(exam, user, newState) then
              // Just update state, do not allow other modifications here
              updateReviewState(user, exam, newState, true)
            val grade          = (request.body \ "grade").asOpt[Int]
            val additionalInfo = (request.body \ "additionalInfo").asOpt[String].orNull
            val gradingType    = Grade.Type.valueOf((request.body \ "gradingType").asOpt[String].orNull)
            val examType = (request.body \ "creditType").asOpt[String].flatMap { creditType =>
              DB.find(classOf[ExamType]).where().eq("type", creditType).find
            }
            exam.setCreditType(examType.orNull)
            grade match
              case Some(g) =>
                val examGrade = DB.find(classOf[Grade], g)
                val scale =
                  if Option(exam.getGradeScale).isEmpty then exam.getCourse.getGradeScale else exam.getGradeScale
                if scale.getGrades.contains(examGrade) then
                  exam.setGrade(examGrade)
                  exam.setGradingType(Grade.Type.GRADED)
                else BadRequest("Invalid grade for this grade scale")
              case None =>
                exam.setGrade(null)
                if gradingType == Grade.Type.NOT_GRADED then
                  exam.setGrade(null)
                  exam.setGradingType(Grade.Type.NOT_GRADED)
                else if gradingType == Grade.Type.POINT_GRADED then
                  exam.setGrade(null)
                  exam.setGradingType(Grade.Type.POINT_GRADED)
                  // Forced partial credit type
                  exam.setCreditType(DB.find(classOf[ExamType]).where().eq("type", "PARTIAL").findOne())
            exam.setAdditionalInfo(additionalInfo)
            exam.setAnswerLanguage((request.body \ "answerLanguage").asOpt[String].orNull)
            exam.setCustomCredit((request.body \ "customCredit").asOpt[Double].map(Double.box).orNull)
            updateReviewState(user, exam, newState, false)

          case None => NotFound("i18n_exam_not_found")
      }

  def sendInspectionMessage(eid: Long): Action[JsValue] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(audited)(parse.json) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            val loggedInUser = request.attrs(Auth.ATTR_USER)
            val message      = (request.body \ "msg").asOpt[String].orNull
            val inspections = DB
              .find(classOf[ExamInspection])
              .fetch("user")
              .fetch("exam")
              .where()
              .eq("exam.id", exam.getId)
              .ne("user", loggedInUser)
              .distinct
              .map(_.getUser)
            val recipients = inspections ++ exam.getParent.getExamOwners.asScala.filterNot(_ == loggedInUser)
            actorSystem.scheduler.scheduleOnce(1.seconds)(
              recipients.foreach(user => emailComposer.composeInspectionMessage(user, loggedInUser, exam, message))
            )
            Ok
          case None => NotFound("i18n_error_exam_not_found")
      }

  def listNoShows(eid: Long, collaborative: Option[Boolean]): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user"))) { request =>
        val el = DB
          .find(classOf[ExamEnrolment])
          .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount, anonymous")
          .fetch("collaborativeExam")
          .fetch("exam.executionType")
          .fetch("reservation")
          .fetch("examinationEventConfiguration.examinationEvent")
          .fetch("user", "id, firstName, lastName, email, userIdentifier")
          .fetch("exam.course", "code, credits")
          .fetch("exam.grade", "id, name")
          .where
          .eq("noShow", true)
        val query =
          if collaborative.getOrElse(false) then el.eq("collaborativeExam.id", eid)
          else el.or.eq("exam.id", eid).eq("exam.parent.id", eid).endOr
        val enrolments     = query.distinct
        val result: Result = Ok(enrolments.asJson)
        val anonIds: Set[Long] = enrolments
          .filter(ee => Option(ee.getCollaborativeExam).isDefined || ee.getExam.isAnonymous)
          .map(_.getId)
        writeAnonymousResult(request, result, anonIds)
      }

  def updateComment(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.SUPPORT, Role.Name.TEACHER)))
      .andThen(validators.validated(CommentValidator)) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            if exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) then Forbidden
            else
              val commentText = request.attrs.get(ScalaAttrs.COMMENT)
              val commentId   = request.attrs.get(ScalaAttrs.COMMENT_ID)
              val comment = commentId match
                case Some(id) => DB.find(classOf[Comment], id)
                case None     => new Comment
              if Option(comment).isEmpty then NotFound
              else
                commentText match
                  case Some(text) =>
                    val user = request.attrs(Auth.ATTR_USER)
                    comment.setComment(text)
                    comment.setModifierWithDate(user)
                    if Option(comment.getId).isEmpty then
                      // new comment
                      comment.setCreatorWithDate(user)
                      comment.save()
                      exam.setExamFeedback(comment)
                      exam.save()
                    else comment.update()
                    Ok(comment.asJson)
                  case None => Ok(comment.asJson)
          case None => NotFound("i18n_error_exam_not_found")
      }

  def addComment(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(CommentValidator)) { request =>
        Option(DB.find(classOf[Exam], id)) match
          case Some(exam) =>
            val comment = new InspectionComment
            val user    = request.attrs(Auth.ATTR_USER)
            comment.setCreatorWithDate(user)
            comment.setModifierWithDate(user)
            comment.setComment(request.attrs.get(ScalaAttrs.COMMENT).orNull)
            comment.setExam(exam)
            comment.save()
            ok(comment.asJson, PathProperties.parse("(creator(firstName, lastName, email), created, comment)"))
          case None => NotFound("i18n_error_exam_not_found")
      }

  def archiveExams: Action[AnyContent] = Action
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
    .andThen(validators.validated(CommaJoinedListValidator)) { request =>
      val ids   = request.attrs(ScalaAttrs.ID_LIST)
      val exams = DB.find(classOf[Exam]).where().eq("state", Exam.State.GRADED_LOGGED).idIn(ids.asJava).distinct
      exams.foreach(e =>
        e.setState(Exam.State.ARCHIVED)
        e.update()
      )
      Ok
    }

  def hasLockedAssessments(eid: Long): Action[AnyContent] =
    Action.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { request =>
      val assessments = DB
        .find(classOf[Exam])
        .where()
        .eq("parent.id", eid)
        .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED, Exam.State.REJECTED)
        .distinct
      if assessments.nonEmpty then
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            if Option(
                exam.getExamFeedbackConfig
              ).isDefined && exam.getExamFeedbackConfig.getReleaseType == ExamFeedbackConfig.ReleaseType.GIVEN_DATE
            then Ok(Json.obj("status" -> "date"))
            else Ok(Json.obj("status" -> "nothing"))
          case None => Ok(Json.obj("status" -> "nothing"))
      else Ok(Json.obj("status" -> "everything"))
    }

  def markCommentAsRead(eid: Long, cid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.STUDENT)))
      .andThen(validators.validated(CommentValidator)) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case Some(exam) =>
            if exam.hasState(Exam.State.ABORTED, Exam.State.ARCHIVED) then Forbidden
            else
              request.attrs.get(ScalaAttrs.FEEDBACK_STATUS) match
                case Some(status) =>
                  Option(DB.find(classOf[Comment], cid)) match
                    case Some(comment) =>
                      val user = request.attrs(Auth.ATTR_USER)
                      comment.setModifierWithDate(user)
                      comment.setFeedbackStatus(status)
                      Ok
                    case None => BadRequest
                case None => BadRequest
          case None => NotFound("i18n_error_exam_not_found")
      }

  private def createQuery(): Query[ExamParticipation] =
    val pp = PathProperties.parse(
      "(" +
        "user(firstName, lastName, email, userIdentifier), " +
        "exam(" +
        "state, name, additionalInfo, gradedTime, gradingType, assessmentInfo, " +
        "subjectToLanguageInspection, answerLanguage, customCredit, " +
        "course(*, organisation(*), gradeScale(*, grades(*))), " +
        "parent(*, creator(*), gradeScale(*, grades(*))), " +
        "examOwners(*), " +
        "examEnrolments(*, reservation(*, machine(*, room(*))), examinationEventConfiguration(*, examinationEvent(*))), " +
        "examInspections(*, user(*)), " +
        "examType(*), " +
        "executionType(*), " +
        "examSections(*, " +
        "sectionQuestions(sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, " +
        "question(id, type, question, shared, attachment(fileName)), " +
        "options(*, option(id, option, correctOption, claimChoiceType)), " +
        "essayAnswer(id, answer, evaluatedScore, attachment(fileName)), " +
        "clozeTestAnswer(id, question, answer, score)" +
        ")" +
        "), " +
        "gradeScale(*, grades(*)), " +
        "grade(*), " +
        "inspectionComments(*, creator(firstName, lastName, email)), " +
        "languageInspection(*, assignee(firstName, lastName, email), statement(*, attachment(*))), " +
        "examFeedback(*, attachment(*)), " +
        "creditType(*), " +
        "attachment(*), " +
        "examLanguages(*)" +
        ")" +
        ")"
    )

    val query = DB.find(classOf[ExamParticipation])
    pp.apply(query)
    query

  private def isDisallowedToModify(exam: Exam, user: User, newState: Exam.State) =
    !exam.getParent.isOwnedOrCreatedBy(user) &&
      !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) &&
      !isRejectedInLanguageInspection(exam, user, newState)

  private def isDisallowedToScore(exam: Exam, user: User) =
    !exam.getParent.isInspectedOrCreatedOrOwnedBy(user) && !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)

  private def isRejectedInLanguageInspection(exam: Exam, user: User, newState: Exam.State) =
    val li = Option(exam.getLanguageInspection)
    newState == Exam.State.REJECTED &&
    li.isDefined &&
    !li.get.getApproved &&
    Option(li.get.getFinishedAt).isDefined &&
    user.hasPermission(Permission.Type.CAN_INSPECT_LANGUAGE)

  private def updateReviewState(user: User, exam: Exam, state: Exam.State, stateOnly: Boolean) =
    exam.setState(state)
    // set grading info only if the exam is really graded, not just modified
    if exam.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED, Exam.State.REJECTED) then
      if !stateOnly then
        exam.setGradedTime(DateTime.now())
        exam.setGradedByUser(user)
      if exam.hasState(Exam.State.REJECTED) then
        // inform student
        notifyPartiesAboutPrivateExamRejection(user, exam)
    exam.update()
    Ok

  private def notifyPartiesAboutPrivateExamRejection(user: User, exam: Exam): Unit =
    actorSystem.scheduler.scheduleOnce(1.second) {
      emailComposer.composeInspectionReady(exam.getCreator, user, exam)
      logger.info("Inspection rejection notification email sent")
    }

  private def round(src: Double): Double = Math.round(src * 100) / 100.0
