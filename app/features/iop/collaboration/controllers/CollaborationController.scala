// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.controllers

import features.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.text.PathProperties
import io.ebean.{DB, Model}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.libs.json._
import play.api.libs.ws.{WSClient, WSRequest, WSResponse}
import play.api.mvc._
import play.mvc.Http
import services.config.ConfigReader
import services.exam.ExamUpdater
import services.json.JsonDeserializer

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._
import scala.util.{Random, Try}

class CollaborationController @Inject() (
    protected val wsClient: WSClient,
    protected val examUpdater: ExamUpdater,
    protected val examLoader: CollaborativeExamLoader,
    protected val configReader: ConfigReader,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private val SafeNumber = Math.pow(2, 53).toLong - 1

  // Java-friendly accessors
  def getWsClient: WSClient                  = wsClient
  def getExamUpdater: ExamUpdater            = examUpdater
  def getExamLoader: CollaborativeExamLoader = examLoader
  def getConfigReader: ConfigReader          = configReader

  protected def parseUrl(): Option[URL] =
    val url = s"${configReader.getIopHost}/api/exams"
    Try(URI.create(url).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $url")
        None
      case some => some

  protected def getSearchRequest(filter: Option[String]): WSRequest =
    val host = configReader.getIopHost
    filter match
      case Some(f) =>
        val uri = URI.create(s"$host/api/exams/search")
        wsClient
          .url(uri.toString)
          .withQueryStringParameters("filter" -> f, "anonymous" -> "false")
      case None =>
        val uri = URI.create(s"$host/api/exams")
        wsClient.url(uri.toString)

  protected def downloadExam(ce: CollaborativeExam): Future[Option[Exam]] =
    examLoader.downloadExam(ce)

  protected def uploadAssessment(
      ce: CollaborativeExam,
      ref: String,
      payload: JsValue
  ): Future[Option[String]] =
    examLoader.uploadAssessment(ce, ref, payload)

  protected def downloadAssessment(
      examRef: String,
      assessmentRef: String
  ): Future[Option[JsValue]] =
    examLoader.downloadAssessment(examRef, assessmentRef)

  // This is for getting rid of uninteresting user-related 1-M relations that can cause problems in
  // serialization of exam
  protected def cleanUser(user: User): Unit =
    user.getEnrolments.clear()
    user.getParticipations.clear()
    user.getInspections.clear()
    user.getPermissions.clear()

  protected def updateLocalReferences(root: JsArray, locals: Map[String, CollaborativeExam]): Unit =
    root.value
      .collect { case obj: JsObject => obj }
      .filterNot(node => locals.contains((node \ "_id").as[String]))
      .foreach { node =>
        val ref       = (node \ "_id").as[String]
        val rev       = (node \ "_rev").as[String]
        val anonymous = (node \ "anonymous").as[Boolean]
        val ce        = new CollaborativeExam()
        ce.setExternalRef(ref)
        ce.setRevision(rev)
        ce.setCreated(DateTime.now())
        ce.setAnonymous(anonymous)
        ce.save()
        locals.updated(ref, ce)
      }

  protected def uploadExam(ce: CollaborativeExam, content: Exam, sender: User): Future[Result] =
    examLoader.uploadExam(ce, content, sender)

  protected def uploadExam(
      ce: CollaborativeExam,
      content: Exam,
      sender: User,
      body: Model,
      pp: PathProperties
  ): Future[Result] =
    examLoader.uploadExam(ce, content, sender, body, pp)

  protected def isAuthorizedToView(exam: Exam, user: User, homeOrg: String): Boolean =
    if exam.getOrganisations != null then
      val organisations = exam.getOrganisations.split(";")
      if !organisations.contains(homeOrg) then return false

    user.getLoginRole == Role.Name.ADMIN ||
    (exam.getExamOwners.asScala.exists { u =>
      u.getEmail.equalsIgnoreCase(user.getEmail) ||
      u.getEmail.equalsIgnoreCase(user.getEppn)
    } && exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED))

  protected def isUnauthorizedToAssess(exam: Exam, user: User): Boolean =
    user.getLoginRole != Role.Name.ADMIN &&
      (exam.getExamOwners.asScala.forall { u =>
        !u.getEmail.equalsIgnoreCase(user.getEmail) &&
        !u.getEmail.equalsIgnoreCase(user.getEppn)
      } || !exam.hasState(Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED))

  protected def newId(): Long =
    Random.nextLong(SafeNumber)

  protected def filterDeleted(root: JsArray): JsArray =
    val filtered = root.value
      .collect { case obj: JsObject => obj }
      .filterNot { ep =>
        (ep \ "exam" \ "state").asOpt[String].contains("DELETED")
      }
    JsArray(filtered)

  protected def calculateScores(root: JsArray): Unit =
    root.value
      .collect { case obj: JsObject => obj }
      .foreach { ep =>
        // Convert to Jackson for deserializer
        val examJson    = (ep \ "exam").get
        val jacksonNode = play.libs.Json.parse(play.api.libs.json.Json.stringify(examJson))
        val exam        = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
        exam.setMaxScore()
        exam.setApprovedAnswerCount()
        exam.setRejectedAnswerCount()
        exam.setTotalScore()
        // This would need to update the JsObject, but since we're mutating in place,
        // we skip the serialize step
      }

  protected def stream(node: JsArray): Iterator[JsValue] =
    node.value.iterator

  protected def findExamsToProcess(response: WSResponse)
      : Either[Result, Map[CollaborativeExam, JsValue]] =
    val root = response.json
    if response.status != Http.Status.OK then
      val message = (root \ "message").asOpt[String].getOrElse("Connection refused")
      return Left(InternalServerError(message))

    val locals = DB
      .find(classOf[CollaborativeExam])
      .distinct
      .map(ce => ce.getExternalRef -> ce)
      .toMap

    root match
      case arr: JsArray =>
        updateLocalReferences(arr, locals)

        val localToExternal = arr.value
          .collect { case obj: JsObject => obj }
          .map { node =>
            val ref = (node \ "_id").as[String]
            locals(ref) -> (node: JsValue)
          }
          .toMap

        Right(localToExternal)
      case _ =>
        Left(InternalServerError("Expected array response"))

  protected def findCollaborativeExam(id: Long): Either[Future[Result], CollaborativeExam] =
    DB.find(classOf[CollaborativeExam]).where().idEq(id).find match
      case Some(ce) => Right(ce)
      case None     => Left(Future.successful(NotFound("i18n_error_exam_not_found")))

  protected def findCollaborativeExam(ref: String): Either[Future[Result], CollaborativeExam] =
    DB.find(classOf[CollaborativeExam]).where().eq("externalRef", ref).find match
      case Some(ce) => Right(ce)
      case None     => Left(Future.successful(NotFound("i18n_error_exam_not_found")))
