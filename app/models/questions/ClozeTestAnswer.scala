// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import com.fasterxml.jackson.annotation.JsonAutoDetect
import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility
import com.fasterxml.jackson.annotation.JsonProperty
import com.fasterxml.jackson.databind.JsonNode
import com.google.gson.{Gson, reflect}
import jakarta.persistence.{Entity, Transient}
import models.base.GeneratedIdentityModel
import models.sections.ExamSectionQuestion
import org.apache.commons.lang3.math.NumberUtils
import org.jsoup.Jsoup
import org.jsoup.nodes.Element

import java.util.regex.Pattern
import scala.compiletime.uninitialized

@Entity
class ClozeTestAnswer extends GeneratedIdentityModel:
  @JsonProperty var answer: String = uninitialized

  @Transient var question: String             = uninitialized
  @Transient var score: ClozeTestAnswer.Score = uninitialized

  def copy(): ClozeTestAnswer =
    val c = new ClozeTestAnswer
    c.answer = answer
    c.save()
    c

  def setQuestion(esq: ExamSectionQuestion): Unit =
    val doc    = Jsoup.parse(esq.question.question)
    val blanks = doc.select(ClozeTestAnswer.ClozeSelector)
    blanks.forEach { b =>
      val isNumeric = ClozeTestAnswer.isNumericBlank(b)
      val id        = b.attr("id")
      b.clearAttributes()
      b.attr("id", id)
      b.tagName("input")
      b.text("")
      b.attr("aria-label", "cloze test answer")
      b.attr("type", if isNumeric then "number" else "text")
      b.attr("class", "cloze-input mt-2")
      if isNumeric then
        b.attr("step", "any")
        b.attr("lang", "fi")
    }
    question = doc.body().children().toString

  def setQuestionWithResults(esqNode: JsonNode, blankAnswerText: String): Unit =
    val doc = Jsoup.parse(esqNode.get("question").get("question").asText())
    doSetQuestionWithResults(doc, blankAnswerText, showCorrect = true)

  def setQuestionWithResults(
      esq: ExamSectionQuestion,
      blankAnswerText: String,
      showCorrect: Boolean
  ): Unit =
    val doc = Jsoup.parse(esq.question.question)
    doSetQuestionWithResults(doc, blankAnswerText, showCorrect)

  def calculateScore(esq: ExamSectionQuestion): ClozeTestAnswer.Score =
    val answers = asMap(new Gson)
    if esq.question.question == null then new ClozeTestAnswer.Score
    else
      val doc    = Jsoup.parse(esq.question.question)
      val blanks = doc.select(ClozeTestAnswer.ClozeSelector)
      val score  = new ClozeTestAnswer.Score
      blanks.forEach { blank =>
        val answer = answers.getOrElse(blank.attr("id"), "")
        if ClozeTestAnswer.isCorrectAnswer(blank, answer) then score.correctAnswers += 1
        else score.incorrectAnswers += 1
      }
      score

  private def doSetQuestionWithResults(
      doc: org.jsoup.nodes.Document,
      blankAnswerText: String,
      showCorrect: Boolean
  ): Unit =
    val answers = asMap(new Gson)
    val blanks  = doc.select(ClozeTestAnswer.ClozeSelector)
    score = new ClozeTestAnswer.Score
    blanks.forEach { b =>
      val isNumeric = ClozeTestAnswer.isNumericBlank(b)
      val answer    = answers.getOrElse(b.attr("id"), "")
      val isCorrect = ClozeTestAnswer.isCorrectAnswer(b, answer)
      val precision = b.attr("precision")
      if isCorrect then score.correctAnswers += 1 else score.incorrectAnswers += 1
      b.clearAttributes()
      b.text("")
      b.append(if answer.isBlank then s"<em>$blankAnswerText</em>" else answer)
      b.attr(
        "class",
        if showCorrect then if isCorrect then "cloze-correct" else "cloze-incorrect"
        else "cloze-neutral"
      )
      if isNumeric then b.after(s"<span class=\"cloze-precision\">[&plusmn;$precision]</span>")
    }
    question = doc.body().children().toString

  private def asMap(gson: Gson): Map[String, String] =
    import scala.jdk.CollectionConverters.*
    val mapType = new reflect.TypeToken[java.util.Map[String, String]]() {}.getType
    Option(gson.fromJson[java.util.Map[String, String]](answer, mapType))
      .fold(Map.empty[String, String])(_.asScala.filter((_, v) => v != null).toMap)

object ClozeTestAnswer:
  private val ClozeSelector     = "span[cloze=true]"
  private val SpecialRegexChars = Pattern.compile("[{}()\\[\\].+?^$\\\\/]")

  @JsonAutoDetect(fieldVisibility = Visibility.ANY)
  class Score:
    var correctAnswers: Int   = 0
    var incorrectAnswers: Int = 0

  private def isNumericBlank(blank: Element): Boolean =
    java.lang.Boolean.parseBoolean(blank.attr("numeric"))

  private def escapeSpecialRegexChars(input: String): String =
    SpecialRegexChars.matcher(input).replaceAll("\\\\$0")

  private def isCorrectNumericAnswer(blank: Element, rawAnswer: String): Boolean =
    if rawAnswer.isBlank then false
    else
      val answerText = rawAnswer.trim
      if !NumberUtils.isParsable(answerText) then false
      else
        val precisionAttr = blank.attr("precision")
        val answer        = answerText.toDouble
        val correctAnswer = blank.text().trim.replaceAll("(^\\h*)|(\\h*$)", "").toDouble
        val precision     = if precisionAttr.isEmpty then 0.0 else precisionAttr.toDouble
        correctAnswer - precision <= answer && answer <= correctAnswer + precision

  private def isCorrectAnswer(blank: Element, rawAnswer: String): Boolean =
    if isNumericBlank(blank) then isCorrectNumericAnswer(blank, rawAnswer)
    else
      val ESC    = "__!ESC__"
      val answer = rawAnswer.trim.replaceAll(" +", " ")
      val correctAnswer =
        blank.text().trim.replaceAll(" +", " ").replaceAll(" \\|", "|").replaceAll("\\| ", "|")
      var regex = escapeSpecialRegexChars(correctAnswer)
        .replaceAll("\\Q\\\\*\\E", ESC)
        .replace("*", ".*")
        .replace(ESC, "\\*")
        .replaceAll("\\Q\\\\|\\E", ESC)
      if regex.contains("|") then regex = s"($regex)"
      regex = regex.replace(ESC, "\\|")
      val isCaseSensitive = java.lang.Boolean.parseBoolean(blank.attr("case-sensitive"))
      val pattern = Pattern.compile(regex, if isCaseSensitive then 0 else Pattern.CASE_INSENSITIVE)
      pattern.matcher(answer).matches()
