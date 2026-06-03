// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.iop.collaboration.services.*
import models.exam.Exam
import models.exam.ExamState
import models.exam.GradeType
import models.iop.CollaborativeExam
import models.questions.ClozeTestAnswer
import models.questions.QuestionType
import models.user.{Role, User}
import org.apache.pekko.stream.scaladsl.StreamConverters
import org.joda.time.DateTime
import play.api.Logging
import play.api.i18n.{Lang, MessagesApi}
import play.api.libs.json.*
import play.api.libs.ws.*
import play.api.mvc.*
import security.Auth.{AuthenticatedAction, authorized}
import security.{Auth, BlockingIOExecutionContext}
import services.config.ConfigReader
import services.csv.CsvBuilder
import services.exam.ExamUpdater
import services.file.FileHandler
import services.json.JsonDeserializer
import services.mail.EmailComposer
import system.AuditedAction
import system.interceptors.{AnonymousHandler, AnonymousJsonFilter}

import java.io.{PipedInputStream, PipedOutputStream}
import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Try

class CollaborativeReviewController @Inject() (
    wsClient: WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoaderService,
    configReader: ConfigReader,
    emailComposer: EmailComposer,
    csvBuilder: CsvBuilder,
    fileHandler: FileHandler,
    collaborativeExamService: CollaborativeExamService,
    collaborativeExamSearchService: CollaborativeExamSearchService,
    collaborativeExamAuthorizationService: CollaborativeExamAuthorizationService,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    anonymous: AnonymousJsonFilter,
    messagesApi: MessagesApi,
    override val controllerComponents: ControllerComponents
)(implicit ec: BlockingIOExecutionContext)
    extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with JsonBodyWritables
    with AnonymousHandler
    with Logging:

  private def parseUrl(examRef: String, assessmentRef: String = null): Option[URL] =
    val url = Option(assessmentRef)
      .map(ref => s"${configReader.getIopHost}/api/exams/$examRef/assessments/$ref")
      .getOrElse(s"${configReader.getIopHost}/api/exams/$examRef/assessments")

    Try(URI.create(url).toURL).toOption

  private def handleSingleAssessmentResponse(
      request: Request[?],
      response: WSResponse,
      admin: Boolean,
      user: User
  ): Result =
    if response.status != OK then
      InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
    else
      val root     = response.json
      val examNode = (root \ "exam").get
      val blankAnswerText =
        messagesApi("clozeTest.blank.answer")(using Lang(user.language.code))

      // Manipulate cloze test answers for convenient display
      val examSections = (examNode \ "examSections").as[Seq[JsValue]]
      examSections.foreach { es =>
        val sectionQuestions = (es \ "sectionQuestions").as[Seq[JsValue]]
        sectionQuestions.foreach { esq =>
          val questionType = (esq \ "question" \ "type").asOpt[String]
          if questionType.contains(QuestionType.ClozeTestQuestion.toString) then
            // Process cloze test answer
            val clozeAnswer = (esq \ "clozeTestAnswer").asOpt[JsValue]
            val cta =
              if clozeAnswer.exists(_.asOpt[Map[String, JsValue]].exists(_.nonEmpty)) then
                JsonDeserializer.deserialize(
                  classOf[ClozeTestAnswer],
                  toJacksonJson(clozeAnswer.get)
                )
              else new ClozeTestAnswer()
            cta.setQuestionWithResults(toJacksonJson(esq), blankAnswerText)
            // Note: actual JSON modification would require mutable JSON manipulation
        }
      }

      // Write anonymous result with admin flag
      writeAnonymousResult(request, Ok(root), true, admin)

  private def handleMultipleAssessmentResponse(
      request: Request[?],
      response: WSResponse,
      admin: Boolean
  ): Result =
    if response.status != OK then
      InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
    else
      val root  = response.json.as[play.api.libs.json.JsArray]
      val valid = CollaborativeExamProcessingService.filterDeleted(root)
      CollaborativeExamProcessingService.calculateScores(valid)

      writeAnonymousResult(request, Ok(valid), true, admin)

  // Helper to stream over Jackson JsonNode (for Java interop)
  private def streamJackson(
      node: com.fasterxml.jackson.databind.JsonNode
  ): java.util.stream.Stream[com.fasterxml.jackson.databind.JsonNode] =
    import scala.jdk.StreamConverters.*
    if Option(node).exists(_.isArray) then node.elements().asScala.asJavaSeqStream
    else java.util.stream.Stream.empty()

  private def forceScoreAnswer(
      examNode: com.fasterxml.jackson.databind.JsonNode,
      qid: Long,
      score: Double
  ): Unit =
    streamJackson(examNode.get("examSections"))
      .flatMap(es => streamJackson(es.get("sectionQuestions")))
      .filter(esq => esq.get("id").asLong() == qid)
      .findAny()
      .ifPresent(esq =>
        esq.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].put("forcedScore", score)
      )

  private def scoreAnswer(
      examNode: com.fasterxml.jackson.databind.JsonNode,
      qid: Long,
      score: Double
  ): Unit =
    streamJackson(examNode.get("examSections"))
      .flatMap(es => streamJackson(es.get("sectionQuestions")))
      .filter(esq => esq.get("id").asLong() == qid)
      .findAny()
      .ifPresent { esq =>
        val essayAnswer = esq.get("essayAnswer")
        if essayAnswer.isObject && !essayAnswer.isEmpty then
          essayAnswer.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].put(
            "evaluatedScore",
            score
          )
        else
          val newAnswer = play.libs.Json.newObject().put("evaluatedScore", score)
          essayAnswer.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].set(
            "essayAnswer",
            newAnswer
          )
      }

  private def updateExamNode(examNode: JsObject, body: JsValue, user: User): JsObject =
    val gradeOpt          = (body \ "grade").asOpt[JsValue]
    val gradingTypeOpt    = (body \ "gradingType").asOpt[String].filter(_.nonEmpty)
    val creditTypeOpt     = (body \ "creditType").asOpt[JsValue]
    val additionalInfoOpt = (body \ "additionalInfo").asOpt[String]
    val answerLanguageOpt = (body \ "answerLanguage").asOpt[String]
    val customCreditOpt   = (body \ "customCredit").asOpt[JsValue]
    val stateOpt          = (body \ "state").asOpt[String]

    val examWithGrade = gradeOpt match
      case Some(grade) if grade != JsNull && grade.asOpt[JsObject].exists(_.fields.nonEmpty) =>
        examNode + ("grade" -> grade) + ("gradingType" -> JsString(GradeType.GRADED.toString))
      case _ if gradingTypeOpt.nonEmpty => examNode + ("grade" -> JsNull)
      case _                            => examNode

    val examWithGradeType =
      gradingTypeOpt.fold(examWithGrade)(t => examWithGrade + ("gradingType" -> JsString(t)))
    val examWithCredit =
      creditTypeOpt.fold(examWithGradeType)(ct => examWithGradeType + ("creditType" -> ct))
    val examWithAdditionalInfo = additionalInfoOpt.fold(examWithCredit)(ai =>
      examWithCredit + ("additionalInfo" -> JsString(ai))
    )
    val examWithAnswerLanguage = answerLanguageOpt.fold(examWithAdditionalInfo)(al =>
      examWithAdditionalInfo + ("answerLanguage" -> JsString(al))
    )
    val examWithCustomCredit = customCreditOpt.fold(examWithAnswerLanguage)(cc =>
      examWithAnswerLanguage + ("customCredit" -> cc)
    )
    val examWithState =
      stateOpt.fold(examWithCustomCredit)(st => examWithCustomCredit + ("state" -> JsString(st)))

    // If state is GRADED or GRADED_LOGGED, also set gradedTime and gradedByUser
    stateOpt match
      case Some(state)
          if state == ExamState.GRADED.toString || state == ExamState.GRADED_LOGGED.toString =>
        val gradedTime = DateTime.now().toString()
        val gradedByUserJson = Json.obj(
          "id"        -> JsNumber(user.id.longValue()),
          "email"     -> user.email,
          "firstName" -> user.firstName,
          "lastName"  -> user.lastName
        )
        examWithState + ("gradedTime" -> JsString(
          gradedTime
        )) + ("gradedByUser" -> gradedByUserJson)
      case _ => examWithState

  def listAssessments(id: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user")))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
          case Left(errorResult) => Future.successful(errorResult)
          case Right(ce) =>
            getRequest(ce, null) match
              case Left(errorFuture) => errorFuture
              case Right(wsRequest) =>
                wsRequest.get().map { response =>
                  handleMultipleAssessmentResponse(request, response, user.hasRole(Role.Name.ADMIN))
                }
        }
      }

  def getParticipationsForExamAndUser(eid: Long, aid: String): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "preEnrolledUserEmail", "grade")))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        collaborativeExamAuthorizationService.findCollaborativeExam(eid).flatMap {
          case Left(errorResult) => Future.successful(errorResult)
          case Right(ce) =>
            parseUrl(ce.externalRef, null) match
              case None => Future.successful(InternalServerError("Invalid URL"))
              case Some(url) =>
                wsClient.url(url.toString).get().map { response =>
                  if response.status != OK then Status(response.status)
                  else
                    val root        = response.json
                    val assessments = root.as[Seq[JsValue]]
                    assessments.find(node => (node \ "_id").asOpt[String].contains(aid)) match
                      case None => NotFound("Assessment not found!")
                      case Some(assessment) =>
                        val eppn = (assessment \ "user" \ "eppn").asOpt[String]
                        if eppn.isEmpty then NotFound("Eppn not found!")
                        else
                          // Filter for user eppn and leave out current assessment
                          val filtered = assessments.filter { node =>
                            val nodeEppn = (node \ "user" \ "eppn").asOpt[String]
                            val nodeId   = (node \ "_id").asOpt[String]
                            nodeEppn == eppn && !nodeId.contains(aid)
                          }
                          writeAnonymousResult(
                            request,
                            Ok(Json.toJson(filtered)),
                            true,
                            user.hasRole(Role.Name.ADMIN)
                          )
                }
        }
      }

  private def isFinished(exam: JsValue): Boolean =
    val state           = (exam \ "state").asOpt[String]
    val gradingType     = (exam \ "gradingType").asOpt[String]
    val hasGrade        = (exam \ "grade" \ "name").asOpt[String].isDefined
    val hasGradedBy     = (exam \ "gradedByUser").isDefined
    val hasCustomCredit = (exam \ "customCredit").isDefined

    state.contains(ExamState.GRADED_LOGGED.toString) &&
    gradingType.contains("GRADED") &&
    hasGrade &&
    hasGradedBy &&
    hasCustomCredit

  private def filterFinished(node: JsValue, ids: Seq[String]): Seq[JsValue] =
    node.as[Seq[JsValue]].filter { assessment =>
      val assessmentId = (assessment \ "_id").asOpt[String]
      val exam         = (assessment \ "exam").asOpt[JsValue]
      assessmentId.exists(ids.contains) && exam.exists(isFinished)
    }

  def exportAssessments(id: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
    .async(controllerComponents.parsers.json) { request =>
      val refs = (request.body \ "refs").asOpt[Seq[String]].getOrElse(Seq.empty)
      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          getRequest(ce, null) match
            case Left(errorFuture) => errorFuture
            case Right(wsRequest) =>
              wsRequest.get().map { response =>
                if response.status != OK then
                  InternalServerError(
                    (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                  )
                else
                  val root          = response.json
                  val filtered      = filterFinished(root, refs)
                  val filteredArray = play.api.libs.json.JsArray(filtered)
                  CollaborativeExamProcessingService.calculateScores(filteredArray)

                  val pos = new PipedOutputStream()
                  val pis = new PipedInputStream(pos)
                  Future {
                    try csvBuilder.streamAssessments(filteredArray)(pos)
                    finally pos.close()
                  }(using ec)
                  Ok.chunked(StreamConverters.fromInputStream(() => pis))
                    .as("text/csv")
                    .withHeaders(
                      "Content-Disposition" -> "attachment; filename=\"assessments.csv\""
                    )
              }
      }
    }

  def getAssessment(id: Long, ref: String): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER)))
      .andThen(anonymous(Set("user", "reservation")))
      .async { request =>
        val user = request.attrs(Auth.ATTR_USER)
        collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
          case Left(errorResult) => Future.successful(errorResult)
          case Right(ce) =>
            parseUrl(ce.externalRef, ref) match
              case None => Future.successful(InternalServerError("Invalid URL"))
              case Some(url) =>
                val admin = user.hasRole(Role.Name.ADMIN)
                wsClient.url(url.toString).get().map { response =>
                  handleSingleAssessmentResponse(request, response, admin, user)
                }
        }
      }

  private def upload(url: URL, payload: JsValue): Future[Result] =
    wsClient.url(url.toString).put(payload).map { response =>
      if response.status != OK then
        InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection error"))
      else
        val rev = (response.json \ "rev").asOpt[String].getOrElse("")
        Ok(Json.obj("rev" -> rev))
    }

  def updateAnswerScore(id: Long, ref: String, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val scoreNode = request.body \ "evaluatedScore"
              val score =
                if scoreNode.isInstanceOf[play.api.libs.json.JsNumber] then scoreNode.asOpt[Double]
                else None
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError(
                      (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                    )
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  score.foreach(s => scoreAnswer(toJacksonJson(examNode), qid, s))
                  val updated =
                    root.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(
                      revision
                    ))
                  upload(url, updated)
              }
      }
    }

  def sendInspectionMessage(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val messageOpt = (request.body \ "msg").asOpt[String]
      if messageOpt.isEmpty then Future.successful(BadRequest("no message received"))
      else
        val user    = request.attrs(Auth.ATTR_USER)
        val message = messageOpt.get
        collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
          case Left(errorResult) => Future.successful(errorResult)
          case Right(ce) =>
            getURL(ce, ref) match
              case Left(errorFuture) => errorFuture
              case Right(url) =>
                wsClient.url(url.toString).get().flatMap { response =>
                  if response.status != OK then
                    Future.successful(
                      InternalServerError(
                        (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                      )
                    )
                  else
                    val examNode = (response.json \ "exam").get
                    val exam = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))
                    if collaborativeExamAuthorizationService.isUnauthorizedToAssess(exam, user) then
                      Future.successful(Forbidden("You are not allowed to modify this object"))
                    else
                      val recipients = exam.examInspections.asScala
                        .map(_.user)
                        .toSet ++ exam.examOwners.asScala

                      emailComposer.scheduleEmail(1.second) {
                        recipients
                          .filter(u => !u.email.equalsIgnoreCase(user.email))
                          .foreach(u =>
                            emailComposer.composeInspectionMessage(u, user, ce, exam, message)
                          )
                      }

                      Future.successful(Ok)
                }
        }
    }

  def forceUpdateAnswerScore(id: Long, ref: String, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamService.findById(id).flatMap {
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          parseUrl(ce.externalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val scoreNode = request.body \ "forcedScore"
              val score =
                if scoreNode.isInstanceOf[play.api.libs.json.JsNumber] then scoreNode.asOpt[Double]
                else None
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError(
                      (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                    )
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  score.foreach(s => forceScoreAnswer(toJacksonJson(examNode), qid, s))
                  val updated =
                    root.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(
                      revision
                    ))
                  upload(url, updated)
              }
      }
    }

  def updateAssessment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          parseUrl(ce.externalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val user = request.attrs(Auth.ATTR_USER)
              CollaborativeExamProcessingService.cleanUser(user)

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError(
                      (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                    )
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  val exam = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                  if collaborativeExamAuthorizationService.isUnauthorizedToAssess(exam, user) then
                    Future.successful(Forbidden("You are not allowed to modify this object"))
                  else if exam.hasState(
                      ExamState.ABORTED,
                      ExamState.REJECTED,
                      ExamState.GRADED_LOGGED,
                      ExamState.ARCHIVED
                    )
                  then Future.successful(Forbidden("Not allowed to update grading of this exam"))
                  else
                    val revision = (request.body \ "rev").asOpt[String]
                    if revision.isEmpty then Future.successful(BadRequest("Missing revision"))
                    else
                      val updatedExamNode =
                        updateExamNode(examNode.as[JsObject], request.body, user)
                      val updated =
                        root.as[JsObject] + ("exam" -> updatedExamNode) + ("rev" -> JsString(
                          revision.get
                        ))
                      upload(url, updated)
              }
      }
    }

  private def getFeedback(body: JsValue, revision: String): JsValue =
    val examNode     = (body \ "exam").get
    val feedbackNode = (examNode \ "examFeedback").asOpt[JsValue].getOrElse(Json.obj())
    feedbackNode

  private def updateFeedbackNode(
      examNode: JsObject,
      commentOpt: Option[String],
      feedbackStatusOpt: Option[Boolean]
  ): JsObject =
    val feedbackNode = (examNode \ "examFeedback").asOpt[JsObject].getOrElse(Json.obj())
    val withComment =
      commentOpt.fold(feedbackNode)(comment => feedbackNode + ("comment" -> JsString(comment)))
    val withStatus = feedbackStatusOpt.fold(withComment)(status =>
      withComment + ("feedbackStatus" -> Json.toJson(status))
    )
    examNode + ("examFeedback" -> withStatus)

  def addComment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val revision = (request.body \ "rev").as[String]
              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError(
                      (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                    )
                  )
                else
                  val root    = response.json
                  val comment = (request.body \ "comment").asOpt[String]
                  if comment.isEmpty then Future.successful(BadRequest("Missing comment"))
                  else
                    val examNode    = (root \ "exam").as[JsObject]
                    val updatedExam = updateFeedbackNode(examNode, comment, None)
                    val updated =
                      root.as[JsObject] + ("exam" -> updatedExam) + ("rev" -> JsString(revision))
                    upload(url, updated)
              }
      }
    }

  def setFeedbackRead(examRef: String, assessmentRef: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(examRef).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          getURL(ce, assessmentRef) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val revision = (request.body \ "rev").as[String]
              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError(
                      (response.json \ "message").asOpt[String].getOrElse("Connection refused")
                    )
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").as[JsObject]
                  val updated = root.as[JsObject] + ("exam" -> updateFeedbackNode(
                    examNode,
                    None,
                    Some(true)
                  )) + ("rev" -> JsString(revision))
                  upload(url, updated)
              }
      }
    }

  def updateAssessmentInfo(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER)))
    .async(controllerComponents.parsers.json) { request =>
      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          parseUrl(ce.externalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val user     = request.attrs(Auth.ATTR_USER)
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                getResponse(response) match
                  case Left(errorFuture) => errorFuture
                  case Right(r) =>
                    val examNode = (r.json \ "exam").get
                    val exam = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                    if collaborativeExamAuthorizationService.isUnauthorizedToAssess(exam, user) then
                      Future.successful(Forbidden("You are not allowed to modify this object"))
                    else if !exam.hasState(ExamState.GRADED_LOGGED) then
                      Future.successful(Forbidden("Not allowed to update grading of this exam"))
                    else
                      val assessmentInfo = (request.body \ "assessmentInfo").asOpt[String]
                      if assessmentInfo.isEmpty then
                        Future.successful(BadRequest("Missing assessmentInfo"))
                      else
                        val examNode = (r.json \ "exam").as[JsObject]
                        val updatedExam =
                          examNode + ("assessmentInfo" -> JsString(assessmentInfo.get))
                        val updated =
                          r.json.as[JsObject] + ("exam" -> updatedExam) + ("rev" -> JsString(
                            revision
                          ))
                        upload(url, updated)
              }
      }
    }

  private def validateExamState(
      exam: Exam,
      gradeRequired: Boolean,
      user: User
  ): Option[Future[Result]] =
    Option(exam) match
      case None => Some(Future.successful(NotFound("Exam not found")))
      case Some(e) =>
        if collaborativeExamAuthorizationService.isUnauthorizedToAssess(e, user) then
          Some(Future.successful(Forbidden("You are not allowed to modify this object")))
        else if (Option(e.grade).isEmpty && gradeRequired) || Option(
            e.creditType
          ).isEmpty || Option(
            e.answerLanguage
          ).isEmpty || Option(e.gradedByUser).isEmpty
        then Some(Future.successful(Forbidden("not yet graded by anyone!")))
        else if e.hasState(
            ExamState.ABORTED,
            ExamState.GRADED_LOGGED,
            ExamState.ARCHIVED
          ) || Option(e.examRecord).isDefined
        then Some(Future.successful(Forbidden("i18n_error_exam_already_graded_logged")))
        else None

  def finalizeAssessment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      CollaborativeExamProcessingService.cleanUser(user)

      collaborativeExamAuthorizationService.findCollaborativeExam(id).flatMap {
        case Left(errorResult) => Future.successful(errorResult)
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              getRequest(ce, ref) match
                case Left(errorFuture) => errorFuture
                case Right(wsr) =>
                  val revision = (request.body \ "rev").asOpt[String]
                  val gradingTypeStr =
                    (request.body \ "gradingType").asOpt[String].filter(_.nonEmpty)
                  val gradingTypeOpt =
                    gradingTypeStr.flatMap(s => Try(GradeType.valueOf(s)).toOption)
                  if revision.isEmpty then Future.successful(BadRequest("Missing revision"))
                  else if gradingTypeStr.isEmpty then
                    Future.successful(BadRequest("gradingType is required"))
                  else if gradingTypeOpt.isEmpty then
                    logger.error(s"Invalid gradingType: ${gradingTypeStr.get}")
                    Future.successful(BadRequest(s"Invalid gradingType: ${gradingTypeStr.get}"))
                  else
                    val gradingType = gradingTypeOpt.get

                    wsr.get().flatMap { response =>
                      getResponse(response) match
                        case Left(errorFuture) => errorFuture
                        case Right(r) =>
                          val examNode = (r.json \ "exam").get
                          val exam =
                            JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                          validateExamState(exam, gradingType == GradeType.GRADED, user) match
                            case Some(errorFuture) => errorFuture
                            case None =>
                              val examNode   = (r.json \ "exam").as[JsObject]
                              val gradedTime = DateTime.now().toString()
                              val gradedByUserJson = Json.obj(
                                "id"        -> JsNumber(user.id.longValue()),
                                "email"     -> user.email,
                                "firstName" -> user.firstName,
                                "lastName"  -> user.lastName
                              )
                              val updatedExam = examNode +
                                ("state"        -> JsString(ExamState.GRADED_LOGGED.toString)) +
                                ("gradingType"  -> JsString(gradingType.toString)) +
                                ("gradedTime"   -> JsString(gradedTime)) +
                                ("gradedByUser" -> gradedByUserJson)
                              val updated =
                                r.json.as[JsObject] + ("exam" -> updatedExam) + ("rev" -> JsString(
                                  revision.get
                                ))
                              upload(url, updated)
                    }
      }
    }

  private def getResponse(wsr: WSResponse): Either[Future[Result], WSResponse] =
    if wsr.status != OK then
      Left(Future.successful(
        InternalServerError((wsr.json \ "message").asOpt[String].getOrElse("Connection refused"))
      ))
    else Right(wsr)

  private def getURL(ce: CollaborativeExam, ref: String): Either[Future[Result], URL] =
    parseUrl(ce.externalRef, ref) match
      case Some(url) => Right(url)
      case None      => Left(Future.successful(InternalServerError("Invalid URL")))

  private def getRequest(ce: CollaborativeExam, ref: String): Either[Future[Result], WSRequest] =
    parseUrl(ce.externalRef, ref) match
      case Some(url) => Right(wsClient.url(url.toString))
      case None      => Left(Future.successful(InternalServerError("Invalid URL")))
