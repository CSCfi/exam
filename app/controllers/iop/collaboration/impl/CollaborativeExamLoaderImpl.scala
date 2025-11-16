// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl

import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.node.ObjectNode
import controllers.iop.collaboration.api.CollaborativeExamLoader
import controllers.iop.transfer.api.ExternalAttachmentLoader
import io.ebean.text.PathProperties
import io.ebean.{DB, Model}
import miscellaneous.config.ConfigReader
import miscellaneous.scala.JavaApiHelper
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import play.api.http.Status.*
import play.api.libs.json.*
import play.api.libs.ws.{WSBodyWritables, WSClient}
import play.api.mvc.{Result, Results}

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.FutureConverters.*
import scala.util.{Failure, Success, Try}

class CollaborativeExamLoaderImpl @Inject() (
    wsClient: WSClient,
    configReader: ConfigReader,
    externalAttachmentLoader: ExternalAttachmentLoader
)(implicit ec: ExecutionContext)
    extends CollaborativeExamLoader
    with JavaApiHelper
    with WSBodyWritables
    with Logging:

  private def parseUrl(examRef: Option[String] = None): Option[URL] =
    val urlString = examRef match
      case Some(ref) => s"${configReader.getIopHost}/api/exams/$ref"
      case None      => s"${configReader.getIopHost}/api/exams"

    Try(URI.create(urlString).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $urlString")
        None
      case some => some

  private def parseAssessmentUrl(examRef: String): Option[URL] =
    val urlString = s"${configReader.getIopHost}/api/exams/$examRef/assessments"
    Try(URI.create(urlString).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $urlString")
        None
      case some => some

  private def parseUrl(examRef: String, assessmentRef: String): Option[URL] =
    val urlString = s"${configReader.getIopHost}/api/exams/$examRef/assessments/$assessmentRef"
    Try(URI.create(urlString).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $urlString")
        None
      case some => some

  private def serializeForUpdate(exam: Exam, revision: String): JsValue =
    Try {
      // Use jackson because it serializes the entire object.
      // TODO: maybe some other mapper can do this too?
      val mapper     = new ObjectMapper()
      val jsonString = mapper.writeValueAsString(exam)
      val node       = mapper.readTree(jsonString)
      // CouchDB expects "rev" (not "_rev") when uploading
      val result = node.asInstanceOf[ObjectNode].put("rev", revision)
      // Convert back to Play JsValue
      Json.parse(mapper.writeValueAsString(result))
    } match
      case Success(value) => value
      case Failure(e) =>
        logger.error("Unable to serialize exam", e)
        throw new RuntimeException(e)

  override def getAssessmentPath(): PathProperties =
    val path =
      "(*, user(id, firstName, lastName, email, eppn, userIdentifier)" +
        "exam(id, name, state, instruction, hash, implementation, duration, trialCount, executionType(id, type), " +
        "examLanguages(code), attachment(id, externalId, fileName)" +
        "autoEvaluationConfig(*, gradeEvaluations(*, grade(*)))" +
        "creditType(*), examType(*), executionType(*)" +
        "gradeScale(*, grades(*))" +
        "examSections(id, name, sequenceNumber, description, lotteryOn, lotteryItemCount," +
        "sectionQuestions(id, sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType, derivedMaxScore, " +
        "question(id, type, question, attachment(id, externalId, fileName), options(*))" +
        "options(*, option(*))" +
        "essayAnswer(id, answer, objectVersion, attachment(id, externalId, fileName))" +
        "clozeTestAnswer(id, question, answer, objectVersion)" +
        ")), examEnrolments(*, user(firstName, lastName, email, eppn, userIdentifier), " +
        "reservation(*, machine(*, room(*)))" +
        ")))"
    PathProperties.parse(path)

  // override def getExamPath(): PathProperties = ???

  override def createAssessmentWithAttachments(participation: ExamParticipation): Future[Boolean] =
    val ref = participation.getCollaborativeExam.getExternalRef
    logger.debug(s"Sending back collaborative assessment for exam $ref")

    parseAssessmentUrl(ref) match
      case None => Future.successful(false)
      case Some(_) =>
        externalAttachmentLoader
          .uploadAssessmentAttachments(participation.getExam)
          .flatMap(_ => createAssessment(participation))

  override def createAssessment(participation: ExamParticipation): Future[Boolean] =
    val ref = participation.getCollaborativeExam.getExternalRef
    logger.debug(s"Sending back collaborative assessment for exam $ref")

    parseAssessmentUrl(ref) match
      case None => Future.successful(false)
      case Some(url) =>
        val request = wsClient.url(url.toString).withHttpHeaders("Content-Type" -> "application/json")
        val json    = DB.json().toJson(participation, getAssessmentPath())

        request
          .post(json)
          .map { response =>
            if response.status != CREATED then
              logger.error(s"Failed in sending assessment for exam $ref")
              false
            else
              participation.setSentForReview(DateTime.now())
              participation.update()
              logger.info(s"Assessment for exam $ref processed successfully")
              true
          }
          .recover { case t =>
            logger.error(s"Could not send assessment to xm! [id=${participation.getId}]", t)
            false
          }

  override def uploadAssessment(ce: CollaborativeExam, ref: String, payload: JsValue): Future[Option[String]] =
    parseUrl(ce.getExternalRef, ref) match
      case None      => Future.successful(None)
      case Some(url) =>
        // TBD: maybe this should be checked on XM
        val updatedPayload = (payload \ "_rev").asOpt[JsValue] match
          case Some(rev) => payload.as[JsObject] + ("rev" -> rev)
          case None      => payload
        val request = wsClient.url(url.toString)

        request.put(Json.stringify(updatedPayload)).map { response =>
          if response.status != OK then
            val root = response.json
            logger.error((root \ "message").asOpt[String].getOrElse("Unknown error"))
            None
          else (response.json \ "rev").asOpt[String]
        }

  override def downloadExam(ce: CollaborativeExam): Future[Option[Exam]] =
    parseUrl(Some(ce.getExternalRef)) match
      case None => Future.successful(None)
      case Some(url) =>
        val request = wsClient.url(url.toString)

        request.get().map { response =>
          val root = response.json
          if response.status != OK then
            logger.warn(s"non-ok response from XM: ${(root \ "message").asOpt[String].getOrElse("unknown")}")
            None
          else
            // Set revision if present (CouchDB revision field can be _rev or rev)
            val revision = (root \ "_rev").asOpt[String].orElse((root \ "rev").asOpt[String])
            revision.foreach(ce.setRevision)

            // Convert JsValue to Jackson JsonNode for getExam
            val jacksonNode = play.libs.Json.parse(Json.stringify(root))
            val exam        = ce.getExam(jacksonNode)

            // Save certain informative properties locally
            ce.setName(exam.getName)
            ce.setPeriodStart(exam.getPeriodStart)
            ce.setPeriodEnd(exam.getPeriodEnd)
            ce.setEnrollInstruction(exam.getEnrollInstruction)
            ce.setDuration(exam.getDuration)
            ce.setHash(exam.getHash)
            ce.setState(exam.getState)
            ce.setAnonymous(exam.isAnonymous)
            ce.update()

            Some(exam)
        }

  override def downloadExamJson(ce: CollaborativeExam): Future[Option[JsValue]] =
    parseUrl(Some(ce.getExternalRef)) match
      case None => Future.successful(None)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        request.get().map { response =>
          val root = response.json
          if response.status != OK then
            logger.warn(s"non-ok response from XM: ${(root \ "message").asOpt[String].getOrElse("unknown")}")
            None
          else
            val revision = (root \ "_rev").asOpt[String].orElse((root \ "rev").asOpt[String])
            revision.foreach(ce.setRevision)
            Some(root)
        }

  override def downloadAssessment(examRef: String, assessmentRef: String): Future[Option[JsValue]] =
    parseUrl(examRef, assessmentRef) match
      case None => Future.successful(None)
      case Some(url) =>
        val request = wsClient.url(url.toString)

        request.get().map { response =>
          val root = response.json
          if response.status != OK then
            logger.warn(s"non-ok response from XM: ${(root \ "message").asOpt[String].getOrElse("unknown")}")
            None
          else Some(root)
        }

  override def uploadExam(
      ce: CollaborativeExam,
      content: Exam,
      sender: User,
      resultModel: Model,
      pp: PathProperties
  ): Future[Result] =
    parseUrl(Some(ce.getExternalRef)) match
      case None => Future.successful(Results.InternalServerError)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        val payload = serializeForUpdate(content, ce.getRevision)
        request.put(payload).map { response =>
          if response.status != OK then
            val root    = response.json
            val message = (root \ "message").asOpt[String].getOrElse("Unknown error")
            Results.InternalServerError(message)
          else if resultModel == null then Results.Ok
          else ok(resultModel, pp)
        }

  override def uploadExam(ce: CollaborativeExam, content: Exam, sender: User): Future[Result] =
    uploadExam(ce, content, sender, null, null)

  override def deleteExam(ce: CollaborativeExam): Future[Result] =
    parseUrl(Some(ce.getExternalRef)) match
      case None => Future.successful(Results.InternalServerError)
      case Some(url) =>
        val request = wsClient.url(url.toString)
        request.delete().map(response => Results.Status(response.status))

  private def ok(obj: Any, pp: PathProperties): Result =
    val body = if pp == null then DB.json().toJson(obj) else DB.json().toJson(obj, pp)
    Results.Ok(body).as("application/json")
