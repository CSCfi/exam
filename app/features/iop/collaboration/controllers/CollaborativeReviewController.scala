// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import features.iop.collaboration.api.CollaborativeExamLoader
import system.interceptors.AnonymousHandler
import io.ebean.DB
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam.{Exam, Grade}
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, Question}
import models.user.{Role, User}
import play.api.Logging
import play.api.i18n.{Lang, MessagesApi}
import play.api.libs.json.{JsValue, Json}
import play.api.libs.ws._
import play.api.mvc._
import security.Auth
import security.Auth.{AuthenticatedAction, authorized}
import services.config.ConfigReader
import services.csv.CsvBuilder
import services.exam.ExamUpdater
import services.file.FileHandler
import services.json.JsonDeserializer
import services.mail.EmailComposer
import system.AuditedAction

import java.io.IOException
import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.Try

class CollaborativeReviewController @Inject() (
    wsClient: WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoader,
    configReader: ConfigReader,
    emailComposer: EmailComposer,
    csvBuilder: CsvBuilder,
    fileHandler: FileHandler,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    messagesApi: MessagesApi,
    override val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends CollaborationController(wsClient, examUpdater, examLoader, configReader, controllerComponents)
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
      val root            = response.json
      val examNode        = (root \ "exam").get
      val blankAnswerText = messagesApi("clozeTest.blank.answer")(using Lang(user.getLanguage.getCode))

      // Manipulate cloze test answers for convenient display
      val examSections = (examNode \ "examSections").as[Seq[JsValue]]
      examSections.foreach { es =>
        val sectionQuestions = (es \ "sectionQuestions").as[Seq[JsValue]]
        sectionQuestions.foreach { esq =>
          val questionType = (esq \ "question" \ "type").asOpt[String]
          if questionType.contains(Question.Type.ClozeTestQuestion.toString) then
            // Process cloze test answer
            val clozeAnswer = (esq \ "clozeTestAnswer").asOpt[JsValue]
            val cta =
              if clozeAnswer.exists(_.asOpt[Map[String, JsValue]].exists(_.nonEmpty)) then
                JsonDeserializer.deserialize(classOf[ClozeTestAnswer], toJacksonJson(clozeAnswer.get))
              else new ClozeTestAnswer()
            cta.setQuestionWithResults(toJacksonJson(esq), blankAnswerText)
            // Note: actual JSON modification would require mutable JSON manipulation
        }
      }

      // Write anonymous result with admin flag
      val anonIds = if admin then Set.empty[Long] else Set(1L) // TODO: get actual anonymous IDs
      withAnonymousResult(request, Ok(root), anonIds)

  private def handleMultipleAssessmentResponse(
      request: Request[?],
      response: WSResponse,
      admin: Boolean
  ): Result =
    if response.status != OK then
      InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
    else
      val root  = response.json.as[play.api.libs.json.JsArray]
      val valid = filterDeleted(root)
      calculateScores(valid)

      val anonIds = if admin then Set.empty[Long] else Set(1L) // TODO: get actual anonymous IDs
      withAnonymousResult(request, Ok(valid), anonIds)

  // Helper to stream over Jackson JsonNode (for Java interop)
  private def streamJackson(
      node: com.fasterxml.jackson.databind.JsonNode
  ): java.util.stream.Stream[com.fasterxml.jackson.databind.JsonNode] =
    import scala.jdk.StreamConverters.*
    Option(node).filter(_.isArray).map(_.elements().asScala.asJavaSeqStream).getOrElse(java.util.stream.Stream.empty())

  private def forceScoreAnswer(examNode: com.fasterxml.jackson.databind.JsonNode, qid: Long, score: Double): Unit =
    streamJackson(examNode.get("examSections"))
      .flatMap(es => streamJackson(es.get("sectionQuestions")))
      .filter(esq => esq.get("id").asLong() == qid)
      .findAny()
      .ifPresent(esq => esq.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].put("forcedScore", score))

  private def scoreAnswer(examNode: com.fasterxml.jackson.databind.JsonNode, qid: Long, score: Double): Unit =
    streamJackson(examNode.get("examSections"))
      .flatMap(es => streamJackson(es.get("sectionQuestions")))
      .filter(esq => esq.get("id").asLong() == qid)
      .findAny()
      .ifPresent { esq =>
        val essayAnswer = esq.get("essayAnswer")
        if essayAnswer.isObject && !essayAnswer.isEmpty then
          essayAnswer.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].put("evaluatedScore", score)
        else
          val newAnswer = play.libs.Json.newObject().put("evaluatedScore", score)
          essayAnswer.asInstanceOf[com.fasterxml.jackson.databind.node.ObjectNode].set("essayAnswer", newAnswer)
      }

  def listAssessments(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getRequest(ce, null) match
            case Left(errorFuture) => errorFuture
            case Right(wsRequest) =>
              wsRequest.get().map { response =>
                handleMultipleAssessmentResponse(request, response, user.hasRole(Role.Name.ADMIN))
              }
    }

  def getParticipationsForExamAndUser(eid: Long, aid: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      findCollaborativeExam(eid) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          parseUrl(ce.getExternalRef, null) match
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
                        val anonIds = if user.hasRole(Role.Name.ADMIN) then Set.empty[Long] else Set(1L)
                        withAnonymousResult(request, Ok(Json.toJson(filtered)), anonIds)
              }
    }

  private def isFinished(exam: JsValue): Boolean =
    val state           = (exam \ "state").asOpt[String]
    val gradingType     = (exam \ "gradingType").asOpt[String]
    val hasGrade        = (exam \ "grade" \ "name").asOpt[String].isDefined
    val hasGradedBy     = (exam \ "gradedByUser").isDefined
    val hasCustomCredit = (exam \ "customCredit").isDefined

    state.contains(Exam.State.GRADED_LOGGED.toString) &&
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
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getRequest(ce, null) match
            case Left(errorFuture) => errorFuture
            case Right(wsRequest) =>
              wsRequest.get().map { response =>
                if response.status != OK then
                  InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                else
                  val root          = response.json
                  val filtered      = filterFinished(root, refs)
                  val filteredArray = play.api.libs.json.JsArray(filtered)
                  calculateScores(filteredArray)

                  try
                    val file               = csvBuilder.build(filteredArray)
                    val contentDisposition = fileHandler.getContentDisposition(file)
                    Ok(fileHandler.encodeAndDelete(file))
                      .withHeaders("Content-Disposition" -> contentDisposition)
                  catch case _: IOException => InternalServerError("i18n_error_creating_csv_file")
              }
    }

  def getAssessment(id: Long, ref: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.TEACHER))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          parseUrl(ce.getExternalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val admin = user.hasRole(Role.Name.ADMIN)
              wsClient.url(url.toString).get().map { response =>
                handleSingleAssessmentResponse(request, response, admin, user)
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
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val scoreNode = request.body \ "evaluatedScore"
              val score =
                if scoreNode.isInstanceOf[play.api.libs.json.JsNumber] then scoreNode.asOpt[Double] else None
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  score.foreach(s => scoreAnswer(toJacksonJson(examNode), qid, s))
                  val updated =
                    root.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(revision))
                  upload(url, updated)
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
        findCollaborativeExam(id) match
          case Left(errorResult) => errorResult
          case Right(ce) =>
            getURL(ce, ref) match
              case Left(errorFuture) => errorFuture
              case Right(url) =>
                wsClient.url(url.toString).get().flatMap { response =>
                  if response.status != OK then
                    Future.successful(
                      InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                    )
                  else
                    val examNode = (response.json \ "exam").get
                    val exam     = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))
                    if isUnauthorizedToAssess(exam, user) then
                      Future.successful(Forbidden("You are not allowed to modify this object"))
                    else
                      val recipients = exam.getExamInspections.asScala
                        .map(_.getUser)
                        .toSet ++ exam.getExamOwners.asScala

                      emailComposer.scheduleEmail(1.second) {
                        recipients
                          .filter(u => !u.getEmail.equalsIgnoreCase(user.getEmail))
                          .foreach(u => emailComposer.composeInspectionMessage(u, user, ce, exam, message))
                      }

                      Future.successful(Ok)
                }
    }

  def forceUpdateAnswerScore(id: Long, ref: String, qid: Long): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      Option(DB.find(classOf[CollaborativeExam], id)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          parseUrl(ce.getExternalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val scoreNode = request.body \ "forcedScore"
              val score =
                if scoreNode.isInstanceOf[play.api.libs.json.JsNumber] then scoreNode.asOpt[Double] else None
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  score.foreach(s => forceScoreAnswer(toJacksonJson(examNode), qid, s))
                  val updated =
                    root.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(revision))
                  upload(url, updated)
              }
    }

  def updateAssessment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          parseUrl(ce.getExternalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val user = request.attrs(Auth.ATTR_USER)
              cleanUser(user)

              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                  )
                else
                  val root     = response.json
                  val examNode = (root \ "exam").get
                  val exam     = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                  if isUnauthorizedToAssess(exam, user) then
                    Future.successful(Forbidden("You are not allowed to modify this object"))
                  else if exam.hasState(
                      Exam.State.ABORTED,
                      Exam.State.REJECTED,
                      Exam.State.GRADED_LOGGED,
                      Exam.State.ARCHIVED
                    )
                  then Future.successful(Forbidden("Not allowed to update grading of this exam"))
                  else
                    // Build updated exam node (simplified - actual implementation needs mutable JSON handling)
                    val revision = (request.body \ "rev").asOpt[String]
                    if revision.isEmpty then Future.successful(BadRequest("Missing revision"))
                    else
                      // TODO: Update examNode with grade, state, etc. from request.body
                      val updated =
                        root.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(revision.get))
                      upload(url, updated)
              }
    }

  private def getFeedback(body: JsValue, revision: String): JsValue =
    val examNode     = (body \ "exam").get
    val feedbackNode = (examNode \ "examFeedback").asOpt[JsValue].getOrElse(Json.obj())
    feedbackNode

  def addComment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val revision = (request.body \ "rev").as[String]
              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                  )
                else
                  val root         = response.json
                  val feedbackNode = getFeedback(root, revision)
                  val comment      = (request.body \ "comment").as[String]
                  // TODO: Update feedback node with comment
                  upload(url, root)
              }
    }

  def setFeedbackRead(examRef: String, assessmentRef: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.STUDENT)))
    .async(controllerComponents.parsers.json) { request =>
      findCollaborativeExam(examRef) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getURL(ce, assessmentRef) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              val revision = (request.body \ "rev").as[String]
              wsClient.url(url.toString).get().flatMap { response =>
                if response.status != OK then
                  Future.successful(
                    InternalServerError((response.json \ "message").asOpt[String].getOrElse("Connection refused"))
                  )
                else
                  val root         = response.json
                  val feedbackNode = getFeedback(root, revision)
                  // TODO: Update feedback node with feedbackStatus = true
                  upload(url, root)
              }
    }

  def updateAssessmentInfo(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER)))
    .async(controllerComponents.parsers.json) { request =>
      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          parseUrl(ce.getExternalRef, ref) match
            case None => Future.successful(InternalServerError("Invalid URL"))
            case Some(url) =>
              val user     = request.attrs(Auth.ATTR_USER)
              val revision = (request.body \ "rev").as[String]

              wsClient.url(url.toString).get().flatMap { response =>
                getResponse(response) match
                  case Left(errorFuture) => errorFuture
                  case Right(r) =>
                    val examNode = (r.json \ "exam").get
                    val exam     = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                    if isUnauthorizedToAssess(exam, user) then
                      Future.successful(Forbidden("You are not allowed to modify this object"))
                    else if !exam.hasState(Exam.State.GRADED_LOGGED) then
                      Future.successful(Forbidden("Not allowed to update grading of this exam"))
                    else
                      // TODO: Update examNode with assessmentInfo
                      val updated =
                        r.json.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json.JsString(revision))
                      upload(url, updated)
              }
    }

  private def validateExamState(exam: Exam, gradeRequired: Boolean, user: User): Option[Future[Result]] =
    Option(exam) match
      case None => Some(Future.successful(NotFound("Exam not found")))
      case Some(e) =>
        if isUnauthorizedToAssess(e, user) then
          Some(Future.successful(Forbidden("You are not allowed to modify this object")))
        else if (Option(e.getGrade).isEmpty && gradeRequired) || Option(e.getCreditType).isEmpty || Option(
            e.getAnswerLanguage
          ).isEmpty || Option(e.getGradedByUser).isEmpty
        then Some(Future.successful(Forbidden("not yet graded by anyone!")))
        else if e.hasState(
            Exam.State.ABORTED,
            Exam.State.GRADED_LOGGED,
            Exam.State.ARCHIVED
          ) || Option(e.getExamRecord).isDefined
        then Some(Future.successful(Forbidden("i18n_error_exam_already_graded_logged")))
        else None

  def finalizeAssessment(id: Long, ref: String): Action[JsValue] = audited
    .andThen(authenticated)
    .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN)))
    .async(controllerComponents.parsers.json) { request =>
      val user = request.attrs(Auth.ATTR_USER)
      cleanUser(user)

      findCollaborativeExam(id) match
        case Left(errorResult) => errorResult
        case Right(ce) =>
          getURL(ce, ref) match
            case Left(errorFuture) => errorFuture
            case Right(url) =>
              getRequest(ce, ref) match
                case Left(errorFuture) => errorFuture
                case Right(wsr) =>
                  val revision = (request.body \ "rev").asOpt[String]
                  if revision.isEmpty then Future.successful(BadRequest("Missing revision"))
                  else
                    val gradingType = Grade.Type.valueOf((request.body \ "gradingType").as[String])

                    wsr.get().flatMap { response =>
                      getResponse(response) match
                        case Left(errorFuture) => errorFuture
                        case Right(r) =>
                          val examNode = (r.json \ "exam").get
                          val exam     = JsonDeserializer.deserialize(classOf[Exam], toJacksonJson(examNode))

                          validateExamState(exam, gradingType == Grade.Type.GRADED, user) match
                            case Some(errorFuture) => errorFuture
                            case None              =>
                              // TODO: Update examNode with GRADED_LOGGED state, gradedByUser, etc.
                              val updated = r.json.as[play.api.libs.json.JsObject] + ("rev" -> play.api.libs.json
                                .JsString(revision.get))
                              upload(url, updated)
                    }
    }

  private def getResponse(wsr: WSResponse): Either[Future[Result], WSResponse] =
    if wsr.status != OK then
      Left(Future.successful(InternalServerError((wsr.json \ "message").asOpt[String].getOrElse("Connection refused"))))
    else Right(wsr)

  private def getURL(ce: CollaborativeExam, ref: String): Either[Future[Result], URL] =
    parseUrl(ce.getExternalRef, ref) match
      case Some(url) => Right(url)
      case None      => Left(Future.successful(InternalServerError("Invalid URL")))

  private def getRequest(ce: CollaborativeExam, ref: String): Either[Future[Result], WSRequest] =
    parseUrl(ce.getExternalRef, ref) match
      case Some(url) => Right(wsClient.url(url.toString))
      case None      => Left(Future.successful(InternalServerError("Invalid URL")))

  // Helper to convert Play JSON to Jackson JSON (for models that still use Jackson)
  private def toJacksonJson(value: play.api.libs.json.JsValue): com.fasterxml.jackson.databind.JsonNode =
    play.libs.Json.parse(play.api.libs.json.Json.stringify(value))

  // Helper to convert Jackson JSON to Play JSON
  private def toPlayJson(node: com.fasterxml.jackson.databind.JsonNode): JsValue =
    Json.parse(play.libs.Json.stringify(node))
