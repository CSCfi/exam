// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.text.PathProperties
import io.ebean.{DB, Query}
import models.assessment.*
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.ExamState
import models.exam.GradeType
import models.exam.{Exam, ExamType, Grade}
import models.questions.QuestionType
import models.questions.{ClozeTestAnswer, EssayAnswer}
import models.sections.ExamSectionQuestion
import models.user.{PermissionType, Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.i18n.{Lang, MessagesApi}
import play.api.libs.json.*
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ReviewService @Inject() (
    private val emailComposer: EmailComposer,
    private val messaging: MessagesApi
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def findExam(examId: Long): Option[Exam] = Option(DB.find(classOf[Exam], examId))

  def listParticipationsForExamAndUser(exam: Exam): List[ExamParticipation] =
    DB
      .find(classOf[ExamParticipation])
      .fetch("exam", "id, state, anonymous")
      .fetch("exam.grade", "id, name")
      .fetch("reservation")
      .fetch("examinationEvent")
      .where()
      .eq("user", exam.creator)
      .eq("exam.parent", exam.parent)
      .or()
      .eq("exam.state", ExamState.ABORTED)
      .eq("exam.state", ExamState.GRADED)
      .eq("exam.state", ExamState.GRADED_LOGGED)
      .eq("exam.state", ExamState.ARCHIVED)
      .endOr()
      .list

  def listNoShowsForExamAndUser(exam: Exam): List[ExamEnrolment] =
    DB
      .find(classOf[ExamEnrolment])
      .fetch("reservation", "startAt, endAt")
      .fetch("examinationEventConfiguration.examinationEvent", "start")
      .where()
      .eq("user", exam.creator)
      .eq("exam", exam.parent)
      .eq("noShow", true)
      .orderBy("reservation.endAt")
      .distinct
      .toList

  def getReview(
      examId: Long,
      user: User,
      blankAnswerText: String
  ): Either[ReviewError, (ExamParticipation, PathProperties)] =
    val isAdmin = user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
    val states = Set(
      ExamState.REVIEW,
      ExamState.REVIEW_STARTED,
      ExamState.GRADED,
      ExamState.GRADED_LOGGED,
      ExamState.REJECTED,
      ExamState.ARCHIVED
    )
    createQuery()
      .where()
      .eq("exam.id", examId)
      .in("exam.state", if isAdmin then (states + ExamState.ABORTED).asJava else states.asJava)
      .find match
      case Some(participation) =>
        val exam = participation.exam
        if !exam.isChildInspectedOrCreatedOrOwnedBy(
            user
          ) && !isAdmin && !exam.isViewableForLanguageInspector(user)
        then Left(ReviewError.AccessForbidden)
        else
          exam.examSections.asScala
            .flatMap(es => es.sectionQuestions.asScala)
            .filter(esq => esq.question.`type` == QuestionType.ClozeTestQuestion)
            .foreach(esq =>
              if Option(esq.clozeTestAnswer).isEmpty then
                val cta = new ClozeTestAnswer
                cta.save()
                esq.clozeTestAnswer = cta
                esq.update()
              esq.clozeTestAnswer.setQuestionWithResults(esq, blankAnswerText, true)
            )
          Right((participation, reviewQueryPP))
      case None => Left(ReviewError.ParticipationNotFound)

  def listReviews(parentExamId: Long, user: User): (List[Exam], List[Long]) =
    val pp = PathProperties.parse(
      """(*,
        |gradingType(*),
        |gradeScale(*, grades(*)),
        |creditType(*),
        |examType(*),
        |executionType(*),
        |examFeedback(*),
        |grade(*),
        |course(*, gradeScale(*, grades(*))),
        |examSections(*,
        |  sectionQuestions(*,
        |    clozeTestAnswer(*),
        |    question(*),
        |    essayAnswer(*),
        |    options(*, option(*))
        |  )
        |),
        |languageInspection(*),
        |examLanguages(*),
        |parent(*,
        |  course(*),
        |  examOwners(*),
        |  examInspections(*, user(*))
        |),
        |examParticipation(*, user(*)),
        |examEnrolments(*)
        |)""".stripMargin
    )
    val baseQuery = DB
      .find(classOf[Exam])
      .apply(pp)
      .where
      .eq("parent.id", parentExamId)
      .in(
        "state",
        ExamState.ABORTED,
        ExamState.REVIEW,
        ExamState.REVIEW_STARTED,
        ExamState.GRADED,
        ExamState.GRADED_LOGGED,
        ExamState.REJECTED,
        ExamState.ARCHIVED
      )
    val finalQuery =
      if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
        baseQuery.or.eq("parent.examOwners", user).eq("examInspections.user", user).endOr
      else baseQuery
    val exams   = finalQuery.distinct.toList
    val anonIds = exams.filter(_.anonymous).map(_.examParticipation.id.longValue)

    // Set calculated fields on exams
    exams.foreach { e =>
      e.setMaxScore()
      e.setApprovedAnswerCount()
      e.setRejectedAnswerCount()
      e.setTotalScore()
    }

    (exams, anonIds)

  def buildParticipationsJson(exams: List[Exam]): Seq[JsValue] =
    exams.map { e =>
      val ep = e.examParticipation
      Json.obj(
        "id"            -> ep.id.longValue,
        "started"       -> Option(ep.started).map(_.getMillis),
        "ended"         -> Option(ep.ended).map(_.getMillis),
        "duration"      -> Option(ep.duration).map(_.getMillis),
        "deadline"      -> Option(ep.deadline).map(_.getMillis),
        "sentForReview" -> Option(ep.sentForReview).map(_.getMillis),
        "user"          -> Option(ep.user).map(_.asJson),
        "exam"          -> e.asJson
      )
    }.toSeq

  def scoreExamQuestion(id: Long, score: Option[Double]): Either[ReviewError, Unit] =
    Option(DB.find(classOf[ExamSectionQuestion], id)) match
      case Some(question) =>
        val essayAnswer = Option(question.essayAnswer) match
          case Some(answer) => answer
          case None =>
            val answer = new EssayAnswer
            answer.save()
            question.essayAnswer = answer
            question.update()
            answer
        essayAnswer.evaluatedScore = round(score.fold(null: java.lang.Double)(Double.box))
        essayAnswer.update()
        Right(())
      case None => Left(ReviewError.QuestionNotFound)

  def forceScoreExamQuestion(
      id: Long,
      score: Option[Double],
      user: User
  ): Either[ReviewError, Unit] =
    DB.find(classOf[ExamSectionQuestion])
      .fetch("examSection.exam.parent.examOwners")
      .where()
      .idEq(id)
      .ne("question.type", QuestionType.EssayQuestion)
      .find match
      case Some(esq) =>
        val exam = esq.examSection.exam
        if isDisallowedToScore(exam, user) then Left(ReviewError.NoPermissionToScore)
        else if exam.hasState(
            ExamState.ABORTED,
            ExamState.REJECTED,
            ExamState.GRADED_LOGGED,
            ExamState.ARCHIVED
          )
        then Left(ReviewError.NotAllowedToUpdateScoring)
        else if score.isDefined && (score.get < esq.getMinScore || score.get > esq.getMaxAssessedScore)
        then
          Left(ReviewError.InvalidScoreRange)
        else
          esq.forcedScore = round(score.fold(null: java.lang.Double)(Double.box))
          esq.update()
          Right(())
      case None => Left(ReviewError.QuestionNotFound)

  def updateAssessmentInfo(id: Long, info: Option[String], user: User): Either[ReviewError, Unit] =
    DB.find(classOf[Exam])
      .fetch("parent.creator")
      .where()
      .idEq(id)
      .in("state", ExamState.GRADED_LOGGED, ExamState.ARCHIVED, ExamState.REJECTED)
      .find match
      case Some(exam) =>
        if isDisallowedToModify(exam, user, exam.state) then
          Left(ReviewError.ModificationForbidden)
        else
          exam.assessmentInfo = info.orNull
          exam.update()
          Right(())
      case None => Left(ReviewError.ExamNotFound)

  def reviewExam(id: Long, body: JsValue, user: User): Either[ReviewError, Unit] =
    DB.find(classOf[Exam]).fetch("parent").fetch("parent.creator").where.idEq(id).find match
      case Some(exam) =>
        val newState = ExamState.valueOf((body \ "state").asOpt[String].orNull)
        if isDisallowedToModify(exam, user, newState) then Left(ReviewError.ModificationForbidden)
        else if exam.hasState(
            ExamState.ABORTED,
            ExamState.REJECTED,
            ExamState.GRADED_LOGGED,
            ExamState.ARCHIVED
          )
        then Left(ReviewError.NotAllowedToUpdateGrading)
        else
          def justUpdateState(): Either[ReviewError, Unit] =
            updateReviewState(user, exam, newState, true)
            Right(())

          if isRejectedInLanguageInspection(exam, user, newState) then
            justUpdateState()
          else
            val grade          = (body \ "grade").asOpt[Int]
            val additionalInfo = (body \ "additionalInfo").asOpt[String].orNull
            val gradingType    = GradeType.valueOf((body \ "gradingType").asOpt[String].orNull)
            val examType = (body \ "creditType").asOpt[String].flatMap { creditType =>
              DB.find(classOf[ExamType]).where().eq("type", creditType).find
            }
            exam.creditType = examType.orNull
            val gradeError = grade match
              case Some(g) =>
                val examGrade = DB.find(classOf[Grade], g)
                val scale =
                  if Option(exam.gradeScale).isEmpty then exam.course.gradeScale
                  else exam.gradeScale
                if scale.grades.contains(examGrade) then
                  exam.grade = examGrade
                  exam.gradingType = GradeType.GRADED
                  None
                else Some(ReviewError.InvalidGradeForScale)
              case None =>
                exam.grade = null
                if gradingType == GradeType.NOT_GRADED then
                  exam.grade = null
                  exam.gradingType = GradeType.NOT_GRADED
                else if gradingType == GradeType.POINT_GRADED then
                  exam.grade = null
                  exam.gradingType = GradeType.POINT_GRADED
                  // Forced partial credit type
                  exam.creditType = DB.find(classOf[ExamType]).where().eq(
                    "type",
                    "PARTIAL"
                  ).find.orNull
                None
            gradeError match
              case Some(e) => Left(e)
              case None =>
                exam.additionalInfo = additionalInfo
                exam.answerLanguage = (body \ "answerLanguage").asOpt[String].orNull
                exam.customCredit = (body \ "customCredit").asOpt[Double].map(Double.box).orNull
                updateReviewState(user, exam, newState, false)
                Right(())
      case None => Left(ReviewError.ExamNotFound)

  def sendInspectionMessage(
      examId: Long,
      message: String,
      loggedInUser: User
  ): Either[ReviewError, Unit] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        val inspections = DB
          .find(classOf[ExamInspection])
          .fetch("user")
          .fetch("exam")
          .where()
          .eq("exam.id", exam.id)
          .ne("user", loggedInUser)
          .distinct
          .map(_.user)
        val recipients =
          inspections ++ exam.parent.examOwners.asScala.filterNot(_ == loggedInUser)
        emailComposer.scheduleEmail(1.seconds) {
          recipients.foreach(user =>
            emailComposer.composeInspectionMessage(user, loggedInUser, exam, message)
          )
        }
        Right(())
      case None => Left(ReviewError.ExamNotFound)

  def listNoShows(eid: Long, collaborative: Option[Boolean]): (List[ExamEnrolment], Set[Long]) =
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
    val enrolments = query.distinct.toList
    val anonIds = enrolments
      .filter(ee => Option(ee.collaborativeExam).isDefined || ee.exam.anonymous)
      .map(_.id.longValue)
      .toSet
    (enrolments, anonIds)

  def updateComment(
      examId: Long,
      commentText: Option[String],
      commentId: Option[Long],
      user: User
  ): Either[ReviewError, Comment] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        if exam.hasState(ExamState.ABORTED, ExamState.GRADED_LOGGED, ExamState.ARCHIVED) then
          Left(ReviewError.Forbidden)
        else
          val comment = commentId match
            case Some(id) => DB.find(classOf[Comment], id)
            case None     => new Comment
          if Option(comment).isEmpty then Left(ReviewError.CommentNotFound)
          else
            commentText match
              case Some(text) =>
                comment.comment = text
                comment.setModifierWithDate(user)
                if comment.id == 0 then
                  // new comment
                  comment.setCreatorWithDate(user)
                  comment.save()
                  exam.examFeedback = comment
                  exam.save()
                else comment.update()
                Right(comment)
              case None => Right(comment)
      case None => Left(ReviewError.ExamNotFound)

  def addComment(
      examId: Long,
      commentText: String,
      user: User
  ): Either[ReviewError, InspectionComment] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        val comment = new InspectionComment
        comment.setCreatorWithDate(user)
        comment.setModifierWithDate(user)
        comment.comment = commentText
        comment.exam = exam
        comment.save()
        Right(comment)
      case None => Left(ReviewError.ExamNotFound)

  def archiveExams(ids: List[Long]): Unit =
    val exams =
      DB.find(classOf[Exam]).where().eq("state", ExamState.GRADED_LOGGED).idIn(ids.asJava).distinct
    exams.foreach(e =>
      e.state = ExamState.ARCHIVED
      e.update()
    )

  def hasLockedAssessments(eid: Long): String =
    val assessments = DB
      .find(classOf[Exam])
      .where()
      .eq("parent.id", eid)
      .in("state", ExamState.GRADED_LOGGED, ExamState.ARCHIVED, ExamState.REJECTED)
      .distinct
    if assessments.nonEmpty then
      Option(DB.find(classOf[Exam], eid)) match
        case Some(exam) =>
          if Option(exam.examFeedbackConfig).isDefined &&
            exam.examFeedbackConfig.releaseType == ExamFeedbackReleaseType.GIVEN_DATE
          then "date"
          else "nothing"
        case None => "nothing"
    else "everything"

  def markCommentAsRead(
      examId: Long,
      commentId: Long,
      status: Boolean,
      user: User
  ): Either[ReviewError, Unit] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        if exam.hasState(ExamState.ABORTED, ExamState.ARCHIVED) then Left(ReviewError.Forbidden)
        else
          Option(DB.find(classOf[Comment], commentId)) match
            case Some(comment) =>
              comment.setModifierWithDate(user)
              comment.feedbackStatus = status
              Right(())
            case None => Left(ReviewError.BadRequest)
      case None => Left(ReviewError.ExamNotFound)

  def getBlankAnswerText(user: User): String =
    messaging("clozeTest.blank.answer")(using Lang.get(user.language.code).get)

  private val reviewQueryPP = PathProperties.parse(
    """(
      |  started, ended, duration, deadline,
      |  user(firstName, lastName, email, userIdentifier),
      |  examinationEvent(*),
      |  exam(
      |    id, state, name, additionalInfo, gradedTime, gradingType, assessmentInfo,
      |    subjectToLanguageInspection, answerLanguage, customCredit,
      |    course(*, organisation(*), gradeScale(*, grades(*))),
      |    parent(*, creator(*), gradeScale(*, grades(*)), examOwners(*), examFeedbackConfig(*)),
      |    examOwners(*),
      |    examEnrolments(information, reservation(*, machine(*, room(*))), examinationEventConfiguration(*, examinationEvent(*))),
      |    examInspections(*, user(*)),
      |    examType(*),
      |    executionType(*),
      |    examSections(*,
      |      sectionQuestions(id, sequenceNumber, maxScore, forcedScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType,
      |        question(id, type, question, shared, attachment(fileName)),
      |        options(*, option(id, option, correctOption, claimChoiceType)),
      |        essayAnswer(id, answer, evaluatedScore, attachment(fileName)),
      |        clozeTestAnswer(id, question, answer, score)
      |      )
      |    ),
      |    gradeScale(*, grades(*)),
      |    grade(*),
      |    inspectionComments(*, creator(firstName, lastName, email)),
      |    languageInspection(*, assignee(firstName, lastName, email), statement(*, attachment(*))),
      |    examFeedback(*, attachment(*)),
      |    creditType(*),
      |    attachment(*),
      |    examLanguages(*)
      |  )
      |)""".stripMargin
  )

  private def createQuery(): Query[ExamParticipation] =
    DB.find(classOf[ExamParticipation]).apply(reviewQueryPP)

  private def isDisallowedToModify(exam: Exam, user: User, newState: Exam.State) =
    !exam.parent.isOwnedOrCreatedBy(user) &&
      !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) &&
      !isRejectedInLanguageInspection(exam, user, newState) &&
      !user.hasPermission(PermissionType.CAN_INSPECT_LANGUAGE)

  private def isDisallowedToScore(exam: Exam, user: User) =
    !exam.parent.isInspectedOrCreatedOrOwnedBy(user) && !user.hasRole(
      Role.Name.ADMIN,
      Role.Name.SUPPORT
    )

  private def isRejectedInLanguageInspection(exam: Exam, user: User, newState: Exam.State) =
    val li = Option(exam.languageInspection)
    newState == ExamState.REJECTED &&
    li.isDefined &&
    !li.get.approved &&
    Option(li.get.finishedAt).isDefined &&
    user.hasPermission(PermissionType.CAN_INSPECT_LANGUAGE)

  private def updateReviewState(
      user: User,
      exam: Exam,
      state: Exam.State,
      stateOnly: Boolean
  ): Unit =
    exam.state = state
    // set grading info only if the exam is really graded, not just modified
    if exam.hasState(ExamState.GRADED, ExamState.GRADED_LOGGED, ExamState.REJECTED) then
      if !stateOnly then
        exam.gradedTime = DateTime.now()
        exam.gradedByUser = user
      if exam.hasState(ExamState.REJECTED) then
        // inform student
        notifyPartiesAboutPrivateExamRejection(user, exam)
    exam.update()

  private def notifyPartiesAboutPrivateExamRejection(user: User, exam: Exam): Unit =
    emailComposer.scheduleEmail(1.second) {
      emailComposer.composeInspectionReady(exam.creator, Some(user), exam)
      logger.info("Inspection rejection notification email sent")
    }

  private def round(src: Double): Double = Math.round(src * 100) / 100.0
