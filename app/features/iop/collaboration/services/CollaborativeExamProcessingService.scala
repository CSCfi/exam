// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.EbeanJsonExtensions
import models.exam.Exam
import models.user.User
import play.api.libs.json.*
import services.json.JsonDeserializer

import scala.util.Random

/** Service for processing collaborative exam data
  *
  * Handles filtering, score calculation, and other data processing operations.
  */
object CollaborativeExamProcessingService:
  private val SafeNumber = Math.pow(2, 53).toLong - 1

  /** Generate a new safe random ID
    *
    * @return
    *   a random Long within safe JavaScript number range
    */
  def newId(): Long = Random.nextLong(SafeNumber)

  /** Filter out deleted exams from JSON array
    *
    * @param root
    *   JSON array containing exam data
    * @return
    *   filtered JSON array without deleted exams
    */
  def filterDeleted(root: JsArray): JsArray =
    val filtered = root.value
      .collect { case obj: JsObject => obj }
      .filterNot { ep =>
        (ep \ "exam" \ "state").asOpt[String].contains("DELETED")
      }
    JsArray(filtered)

  /** Calculate scores for exams in JSON array
    *
    * Note: This mutates the Exam objects but doesn't update the JSON. The JSON would need to be
    * re-serialized to reflect changes.
    *
    * @param root
    *   JSON array containing exam data
    */
  def calculateScores(root: JsArray): Unit =
    root.value
      .collect { case obj: JsObject => obj }
      .foreach { ep =>
        // Convert to Jackson for deserializer
        val examJson    = (ep \ "exam").get
        val jacksonNode = EbeanJsonExtensions.toJacksonJson(examJson)
        val exam        = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
        exam.setMaxScore()
        exam.setApprovedAnswerCount()
        exam.setRejectedAnswerCount()
        exam.setTotalScore()
        // This would need to update the JsObject, but since we're mutating in place,
        // we skip the serialize step
      }

  /** Clean user relations to avoid serialization issues
    *
    * Removes 1-M relations that can cause problems during serialization.
    *
    * @param user
    *   the user to clean
    */
  def cleanUser(user: User): Unit =
    user.getEnrolments.clear()
    user.getParticipations.clear()
    user.getInspections.clear()
    user.getPermissions.clear()

  /** Stream JSON array values as iterator
    *
    * @param node
    *   JSON array to stream
    * @return
    *   iterator over JSON values
    */
  def stream(node: JsArray): Iterator[JsValue] =
    node.value.iterator
