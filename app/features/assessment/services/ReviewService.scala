// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import io.ebean.text.PathProperties
import io.ebean.{DB, Query}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.assessment._
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.{Exam, ExamType, Grade}
import models.questions.{ClozeTestAnswer, EssayAnswer, Question}
import models.sections.ExamSectionQuestion
import models.user.{Permission, Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.i18n.{Lang, MessagesApi}
import play.api.libs.json._
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration._
import scala.jdk.CollectionConverters._

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

  def listNoShowsForExamAndUser(exam: Exam): List[ExamEnrolment] =
    DB
      .find(classOf[ExamEnrolment])
      .fetch("reservation", "startAt, endAt")
      .fetch("examinationEventConfiguration.examinationEvent", "start")
      .where()
      .eq("user", exam.getCreator)
      .eq("exam", exam.getParent)
      .eq("noShow", true)
      .orderBy("reservation.endAt")
      .distinct
      .toList

  def getReview(examId: Long, user: User, blankAnswerText: String): Either[ReviewError, ExamParticipation] =
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
      .eq("exam.id", examId)
      .in("exam.state", if isAdmin then (states + Exam.State.ABORTED).asJava else states.asJava)
      .find match
      case Some(participation) =>
        val exam = participation.getExam
        if !exam.isChildInspectedOrCreatedOrOwnedBy(user) && !isAdmin && !exam.isViewableForLanguageInspector(user)
        then Left(ReviewError.AccessForbidden)
        else
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
          Right(participation)
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
      .where()
      .apply(pp)
      .where
      .eq("parent.id", parentExamId)
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
    val finalQuery =
      if !user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) then
        baseQuery.or.eq("parent.examOwners", user).eq("examInspections.user", user).endOr
      else baseQuery
    val exams   = finalQuery.distinct.toList
    val anonIds = exams.filter(_.isAnonymous).map(_.getExamParticipation.getId.longValue)

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
      val ep = e.getExamParticipation
      Json.obj(
        "id"            -> ep.getId.longValue,
        "started"       -> Option(ep.getStarted).map(_.getMillis),
        "ended"         -> Option(ep.getEnded).map(_.getMillis),
        "duration"      -> Option(ep.getDuration).map(_.getMillis),
        "deadline"      -> Option(ep.getDeadline).map(_.getMillis),
        "sentForReview" -> Option(ep.getSentForReview).map(_.getMillis),
        "user"          -> Option(ep.getUser).map(_.asJson),
        "exam"          -> e.asJson
      )
    }.toSeq

  def scoreExamQuestion(id: Long, score: Option[Double]): Either[ReviewError, Unit] =
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
        essayAnswer.setEvaluatedScore(round(score.fold(null: java.lang.Double)(Double.box)))
        essayAnswer.update()
        Right(())
      case None => Left(ReviewError.QuestionNotFound)

  def forceScoreExamQuestion(id: Long, score: Option[Double], user: User): Either[ReviewError, Unit] =
    DB.find(classOf[ExamSectionQuestion])
      .fetch("examSection.exam.parent.examOwners")
      .where()
      .idEq(id)
      .ne("question.type", Question.Type.EssayQuestion)
      .find match
      case Some(esq) =>
        val exam = esq.getExamSection.getExam
        if isDisallowedToScore(exam, user) then Left(ReviewError.NoPermissionToScore)
        else if exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
        then Left(ReviewError.NotAllowedToUpdateScoring)
        else if score.isDefined && (score.get < esq.getMinScore || score.get > esq.getMaxAssessedScore) then
          Left(ReviewError.InvalidScoreRange)
        else
          esq.setForcedScore(round(score.fold(null: java.lang.Double)(Double.box)))
          esq.update()
          Right(())
      case None => Left(ReviewError.QuestionNotFound)

  def updateAssessmentInfo(id: Long, info: Option[String], user: User): Either[ReviewError, Unit] =
    DB.find(classOf[Exam])
      .fetch("parent.creator")
      .where()
      .idEq(id)
      .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
      .find match
      case Some(exam) =>
        if !exam.hasState(Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) ||
          isDisallowedToModify(exam, user, exam.getState)
        then Left(ReviewError.ModificationForbidden)
        else
          exam.setAssessmentInfo(info.orNull)
          exam.update()
          Right(())
      case None => Left(ReviewError.ExamNotFound)

  def reviewExam(id: Long, body: JsValue, user: User): Either[ReviewError, Unit] =
    DB.find(classOf[Exam]).fetch("parent").fetch("parent.creator").where.idEq(id).find match
      case Some(exam) =>
        val newState = Exam.State.valueOf((body \ "state").asOpt[String].orNull)
        if isDisallowedToModify(exam, user, newState) then Left(ReviewError.ModificationForbidden)
        else if exam.hasState(Exam.State.ABORTED, Exam.State.REJECTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)
        then Left(ReviewError.NotAllowedToUpdateGrading)
        else
          if isRejectedInLanguageInspection(exam, user, newState) then
            // Just update state, do not allow other modifications here
            updateReviewState(user, exam, newState, true)
          else
            val grade          = (body \ "grade").asOpt[Int]
            val additionalInfo = (body \ "additionalInfo").asOpt[String].orNull
            val gradingType    = Grade.Type.valueOf((body \ "gradingType").asOpt[String].orNull)
            val examType = (body \ "creditType").asOpt[String].flatMap { creditType =>
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
                else return Left(ReviewError.InvalidGradeForScale)
              case None =>
                exam.setGrade(null)
                if gradingType == Grade.Type.NOT_GRADED then
                  exam.setGrade(null)
                  exam.setGradingType(Grade.Type.NOT_GRADED)
                else if gradingType == Grade.Type.POINT_GRADED then
                  exam.setGrade(null)
                  exam.setGradingType(Grade.Type.POINT_GRADED)
                  // Forced partial credit type
                  exam.setCreditType(DB.find(classOf[ExamType]).where().eq("type", "PARTIAL").find.orNull)
            exam.setAdditionalInfo(additionalInfo)
            exam.setAnswerLanguage((body \ "answerLanguage").asOpt[String].orNull)
            exam.setCustomCredit((body \ "customCredit").asOpt[Double].map(Double.box).orNull)
            updateReviewState(user, exam, newState, false)
          Right(())
      case None => Left(ReviewError.ExamNotFound)

  def sendInspectionMessage(examId: Long, message: String, loggedInUser: User): Either[ReviewError, Unit] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
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
        emailComposer.scheduleEmail(1.seconds) {
          recipients.foreach(user => emailComposer.composeInspectionMessage(user, loggedInUser, exam, message))
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
      .filter(ee => Option(ee.getCollaborativeExam).isDefined || ee.getExam.isAnonymous)
      .map(_.getId.longValue)
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
        if exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED) then
          Left(ReviewError.Forbidden)
        else
          val comment = commentId match
            case Some(id) => DB.find(classOf[Comment], id)
            case None     => new Comment
          if Option(comment).isEmpty then Left(ReviewError.CommentNotFound)
          else
            commentText match
              case Some(text) =>
                comment.setComment(text)
                comment.setModifierWithDate(user)
                if Option(comment.getId).isEmpty then
                  // new comment
                  comment.setCreatorWithDate(user)
                  comment.save()
                  exam.setExamFeedback(comment)
                  exam.save()
                else comment.update()
                Right(comment)
              case None => Right(comment)
      case None => Left(ReviewError.ExamNotFound)

  def addComment(examId: Long, commentText: String, user: User): Either[ReviewError, InspectionComment] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        val comment = new InspectionComment
        comment.setCreatorWithDate(user)
        comment.setModifierWithDate(user)
        comment.setComment(commentText)
        comment.setExam(exam)
        comment.save()
        Right(comment)
      case None => Left(ReviewError.ExamNotFound)

  def archiveExams(ids: List[Long]): Unit =
    val exams = DB.find(classOf[Exam]).where().eq("state", Exam.State.GRADED_LOGGED).idIn(ids.asJava).distinct
    exams.foreach(e =>
      e.setState(Exam.State.ARCHIVED)
      e.update()
    )

  def hasLockedAssessments(eid: Long): String =
    val assessments = DB
      .find(classOf[Exam])
      .where()
      .eq("parent.id", eid)
      .in("state", Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED, Exam.State.REJECTED)
      .distinct
    if assessments.nonEmpty then
      Option(DB.find(classOf[Exam], eid)) match
        case Some(exam) =>
          if Option(exam.getExamFeedbackConfig).isDefined &&
            exam.getExamFeedbackConfig.getReleaseType == ExamFeedbackConfig.ReleaseType.GIVEN_DATE
          then "date"
          else "nothing"
        case None => "nothing"
    else "everything"

  def markCommentAsRead(examId: Long, commentId: Long, status: Boolean, user: User): Either[ReviewError, Unit] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        if exam.hasState(Exam.State.ABORTED, Exam.State.ARCHIVED) then Left(ReviewError.Forbidden)
        else
          Option(DB.find(classOf[Comment], commentId)) match
            case Some(comment) =>
              comment.setModifierWithDate(user)
              comment.setFeedbackStatus(status)
              Right(())
            case None => Left(ReviewError.BadRequest)
      case None => Left(ReviewError.ExamNotFound)

  def getBlankAnswerText(user: User): String =
    messaging("clozeTest.blank.answer")(using Lang.get(user.getLanguage.getCode).get)

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

  private def updateReviewState(user: User, exam: Exam, state: Exam.State, stateOnly: Boolean): Unit =
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

  private def notifyPartiesAboutPrivateExamRejection(user: User, exam: Exam): Unit =
    emailComposer.scheduleEmail(1.second) {
      emailComposer.composeInspectionReady(exam.getCreator, Some(user), exam)
      logger.info("Inspection rejection notification email sent")
    }

  private def round(src: Double): Double = Math.round(src * 100) / 100.0
