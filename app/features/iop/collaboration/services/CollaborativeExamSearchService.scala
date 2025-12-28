// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import models.iop.CollaborativeExam
import play.api.Logging
import play.api.libs.json.*
import play.api.libs.ws.{WSClient, WSRequest, WSResponse}
import play.api.mvc.{Result, Results}
import play.mvc.Http
import security.BlockingIOExecutionContext
import services.config.ConfigReader

import java.net.{URI, URL}
import javax.inject.Inject
import scala.concurrent.Future
import scala.util.Try

/** Service for collaborative exam search and processing operations
  *
  * Handles searching for exams, processing responses, and updating local references.
  */
class CollaborativeExamSearchService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    configReader: ConfigReader,
    wsClient: WSClient,
    private val ec: BlockingIOExecutionContext
) extends Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Build a search request for collaborative exams
    *
    * @param filter
    *   optional filter string for searching
    * @return
    *   WSRequest configured for the search
    */
  def buildSearchRequest(filter: Option[String]): WSRequest =
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

  /** Parse and build the base exams URL
    *
    * @return
    *   Some(URL) if valid, None otherwise
    */
  def parseExamsUrl(): Option[URL] =
    val url = s"${configReader.getIopHost}/api/exams"
    Try(URI.create(url).toURL).toOption match
      case None =>
        logger.error(s"Malformed URL: $url")
        None
      case some => some

  /** Extract exam references from JSON array
    *
    * @param root
    *   JSON array containing exam data
    * @param locals
    *   existing local collaborative exams by external reference
    * @return
    *   Future containing updated map of local exams
    */
  private def extractAndUpdateLocalReferences(
      root: JsArray,
      locals: Map[String, CollaborativeExam]
  ): Future[Map[String, CollaborativeExam]] =
    val newRefs = root.value
      .collect { case obj: JsObject => obj }
      .filterNot(node => locals.contains((node \ "_id").as[String]))
      .map { node =>
        val ref       = (node \ "_id").as[String]
        val rev       = (node \ "_rev").as[String]
        val anonymous = (node \ "anonymous").as[Boolean]
        (ref, rev, anonymous)
      }
      .toSeq

    collaborativeExamService.updateLocalReferences(newRefs, locals)

  /** Process HTTP response and find exams to process
    *
    * @param response
    *   HTTP response containing exam data
    * @return
    *   Future containing Either[Result error, Map of CollaborativeExam to JSON]
    */
  def findExamsToProcess(
      response: WSResponse
  ): Future[Either[Result, Map[CollaborativeExam, JsValue]]] =
    val root = response.json
    if response.status != Http.Status.OK then
      val message = (root \ "message").asOpt[String].getOrElse("Connection refused")
      return Future.successful(Left(Results.InternalServerError(message)))

    collaborativeExamService.findAllByExternalRef().flatMap { locals =>
      root match
        case arr: JsArray =>
          extractAndUpdateLocalReferences(arr, locals).map { updatedLocals =>
            val localToExternal = arr.value
              .collect { case obj: JsObject => obj }
              .map { node =>
                val ref = (node \ "_id").as[String]
                updatedLocals(ref) -> (node: JsValue)
              }
              .toMap

            Right(localToExternal)
          }
        case _ =>
          Future.successful(Left(Results.InternalServerError("Expected array response")))
    }
