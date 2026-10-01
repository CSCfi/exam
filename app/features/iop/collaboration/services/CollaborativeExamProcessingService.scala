// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import com.fasterxml.jackson.databind.JsonNode
import com.fasterxml.jackson.databind.node.ObjectNode
import database.EbeanJsonExtensions
import models.exam.Exam
import models.questions.{ClozeTestAnswer, QuestionType}
import models.user.User
import play.api.libs.json.*
import services.json.JsonDeserializer

import scala.jdk.CollectionConverters.*
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

  /** Recalculate the score aggregates for every exam in a JSON array
    *
    * The aggregates are transient on [[Exam]], so the copy stored at the remote end only reflects
    * the state at the time that copy was written — grading done since then is not in it. They are
    * therefore recomputed from the answers on every read and written back into the JSON.
    *
    * @param root
    *   JSON array containing participations
    * @return
    *   the array with up to date aggregates on each exam
    */
  def calculateScores(root: JsArray): JsArray =
    JsArray(root.value.map {
      case ep: JsObject =>
        (ep \ "exam").asOpt[JsObject].fold(ep) { examJson =>
          // Convert to Jackson for deserializer
          val jacksonNode = EbeanJsonExtensions.toJacksonJson(examJson)
          val exam        = JsonDeserializer.deserialize(classOf[Exam], jacksonNode)
          exam.setMaxScore()
          exam.setApprovedAnswerCount()
          exam.setRejectedAnswerCount()
          exam.setTotalScore()
          val aggregates = Json.obj(
            "maxScore"            -> exam.maxScore,
            "totalScore"          -> exam.totalScore,
            "approvedAnswerCount" -> exam.approvedAnswerCount,
            "rejectedAnswerCount" -> exam.rejectedAnswerCount
          )
          ep + ("exam" -> (examJson ++ aggregates))
        }
      case other => other
    })

  /** Populate the transient `question` and `score` properties of every cloze test answer found
    * under the given exam node.
    *
    * The remote end stores neither of them, so the review UI has nothing to render unless we
    * compute them here and write them back into the JSON.
    *
    * @param examNode
    *   Jackson exam node, mutated in place
    * @param blankAnswerText
    *   localized placeholder shown in place of a blank the student left empty
    */
  def resolveClozeTestAnswers(examNode: JsonNode, blankAnswerText: String): Unit =
    val sectionQuestions =
      for
        es  <- elements(examNode.get("examSections"))
        esq <- elements(es.get("sectionQuestions"))
        if Option(esq.get("question"))
          .flatMap(q => Option(q.get("type")))
          .map(_.asText)
          .contains(QuestionType.ClozeTestQuestion.toString)
      yield esq.asInstanceOf[ObjectNode]

    sectionQuestions.foreach { esq =>
      val existing = Option(esq.get("clozeTestAnswer")).filter(n => n.isObject && !n.isEmpty)
      val cta = existing
        .map(JsonDeserializer.deserialize(classOf[ClozeTestAnswer], _))
        .getOrElse(new ClozeTestAnswer)
      cta.setQuestionWithResults(esq, blankAnswerText)
      val answer = existing.fold(play.libs.Json.newObject())(_.asInstanceOf[ObjectNode])
      answer.put("question", cta.question)
      answer.set(
        "score",
        play.libs.Json
          .newObject()
          .put("correctAnswers", cta.score.correctAnswers)
          .put("incorrectAnswers", cta.score.incorrectAnswers)
      )
      esq.set("clozeTestAnswer", answer)
    }

  private def elements(node: JsonNode): Seq[JsonNode] =
    if Option(node).exists(_.isArray) then node.elements().asScala.toSeq else Nil

  /** Clean user relations to avoid serialization issues
    *
    * Removes 1-M relations that can cause problems during serialization.
    *
    * @param user
    *   the user to clean
    */
  def cleanUser(user: User): Unit =
    user.enrolments.clear()
    user.participations.clear()
    user.inspections.clear()
    user.permissions.clear()

  /** Stream JSON array values as iterator
    *
    * @param node
    *   JSON array to stream
    * @return
    *   iterator over JSON values
    */
  def stream(node: JsArray): Iterator[JsValue] =
    node.value.iterator
