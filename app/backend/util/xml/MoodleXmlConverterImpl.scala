package backend.util.xml

import java.io.File
import java.nio.file.Files
import java.util.Base64

import backend.models.Tag
import backend.models.questions.{MultipleChoiceOption, Question}
import org.jsoup.Jsoup

import scala.collection.JavaConverters._
import scala.io.Source
import scala.xml._
import scala.xml.parsing.ConstructingParser

class MoodleXmlConverterImpl extends MoodleXmlConverter {

  private def moodleType(question: Question): String = question.getType.toString match {
    case "EssayQuestion"     => "essay"
    case "ClozeTestQuestion" => "cloze"
    case _                   => "multichoice"
  }

  private def Essay: Node = <answer fraction="0"><text></text></answer>

  private def convertMultiChoiceOption(option: MultipleChoiceOption): Node = {
    val fraction = if (option.isCorrectOption) 100 else 0
    <answer fraction={fraction.toString}>
        <text>{option.getOption}</text>
    </answer>
  }

  private def convertWeightedMultiChoiceOption(option: MultipleChoiceOption,
                                               maxScore: Double): Node = {
    val fraction = option.getDefaultScore / maxScore * 100
    <answer fraction={fraction.toString}>
        <text>{option.getOption}</text>
    </answer>
  }

  private def convertByType(question: Question): NodeBuffer = question.getType.toString match {
    case "MultipleChoiceQuestion" =>
      val config =
        <shuffleanswers>1</shuffleanswers>
        <single>true</single>
        <answernumbering>none</answernumbering>
      val options = question.getOptions.asScala.map(convertMultiChoiceOption)
      config ++= options
    case "WeightedMultipleChoiceQuestion" =>
      val config =
        <shuffleanswers>1</shuffleanswers>
        <single>false</single>
        <answernumbering>none</answernumbering>
      val options = question.getOptions.asScala.map(o =>
        convertWeightedMultiChoiceOption(o, question.getMaxDefaultScore))
      config ++= options
    case "EssayQuestion" =>
      val criteria = question.getDefaultEvaluationCriteria match {
        case ec if isEmpty(ec) => PCData("")
        case ec                => PCData(ec)
      }
      val config =
        <graderinfo format="html">
          <text>
            {criteria}
          </text>
        </graderinfo>
        <attachments>1</attachments>
      config ++= Essay
  }

  private def stripHtml(html: String): String = Jsoup.parse(html).text

  private def isEmpty(x: String) = x == null || x.isEmpty

  private def convert(tag: Tag): Node = <tag><text>{tag.getName}</text></tag>

  private def maxScore(question: Question): Double =
    if (question.getDefaultEvaluationType == Question.EvaluationType.Selection) 1
    else question.getMaxDefaultScore()

  private def attachment(question: Question): Option[(String, Node)] =
    question.getAttachment match {
      case null => None
      case a =>
        val file     = new File(a.getFilePath)
        val data     = Files.readAllBytes(file.toPath)
        val b64      = Base64.getEncoder.encodeToString(data)
        val filename = a.getFileName
        val ref =
          s"""<br />Attachment: <a href="@@PLUGINFILE@@/$filename">${filename.toUpperCase}</a>"""
        Some(ref, <file name={a.getFileName} path="/" encoding="base64">{b64}</file>)
    }

  private def convert(question: Question): Node = {
    val text = question.getQuestion.replace(" class=\"math-tex\"", "")
    val instructions = question.getDefaultAnswerInstructions match {
      case i if isEmpty(i) => ""
      case i               => s"<br />Answer instructions: $i"
    }
    val wc = question.getDefaultExpectedWordCount match {
      case null => ""
      case c    => s"<br /> Expected word count: $c"
    }
    val att          = attachment(question)
    val ref          = att.map(_._1).getOrElse("")
    val questionText = s"$text $instructions $wc $ref"
    val name         = stripHtml(text)
    <question type={moodleType(question)}>
        <name>
            <text>{name.take(30)}...</text>
        </name>
        <questiontext format="html">
            <text>
                {PCData(questionText)}
            </text>
            {att.map(_._2).getOrElse("")}
        </questiontext>
        <defaultgrade>{maxScore(question)}</defaultgrade>
        <tags>
            {question.getTags.asScala.map(convert)}
        </tags>
        {convertByType(question)}
    </question>
  }

  def convert(questions: Seq[Question]): String = {
    val quiz: Node =
      <quiz>
          {questions.map(convert)}
      </quiz>
    val pp = new PrettyPrinter(80, 4)
    val doc = ConstructingParser
      .fromSource(Source.fromString(pp.format(quiz)), preserveWS = true)
      .document()
      .docElem
    val writer = new java.io.StringWriter
    XML.write(writer, doc, "utf-8", xmlDecl = true, doctype = null)
    writer.close()
    writer.toString
  }

}
