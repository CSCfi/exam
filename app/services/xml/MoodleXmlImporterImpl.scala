// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.xml

import io.ebean.DB
import database.EbeanQueryExtensions
import models.attachment.Attachment
import models.questions.{MultipleChoiceOption, Question, Tag}
import models.user.User
import org.apache.commons.compress.archivers.tar._
import org.apache.commons.compress.compressors.CompressorStreamFactory
import org.jsoup.Jsoup
import org.jsoup.nodes.{Element, TextNode}
import play.api.Logging
import services.file.FileHandler

import java.io.{BufferedOutputStream, File}
import java.nio.file.{Files, Path}
import java.util.Base64
import javax.inject.Inject
import scala.xml._

class MoodleXmlImporterImpl @Inject() (fileHandler: FileHandler)
    extends MoodleXmlImporter
    with EbeanQueryExtensions
    with Logging:

  import scala.jdk.CollectionConverters.*
  import scala.jdk.StreamConverters.*

  private def tags(src: Node, user: User): Seq[Tag] =
    (src \\ "tag" \ "text")
      .map(node =>
        DB
          .find(classOf[Tag])
          .where
          .eq("name", node.text)
          .eq("creator", user)
          .list match
          case h :: _ => h
          case _ =>
            val t = new Tag
            t.setName(node.text.toLowerCase.take(32)) // max tag length in exam
            t.setCreator(user)
            t
      )

  private def copyFile(srcFile: Path, id: Long) =
    val newFilePath = fileHandler.createFilePath("question", id.toString)
    fileHandler.copyFile(srcFile, new File(newFilePath))
    newFilePath

  private def files(src: Node) =
    (src \\ "file").map(n =>
      val (name, data) = (n \@ "name", n.text)
      val bytes        = Base64.getDecoder.decode(data)
      val ct           = Files.probeContentType(Path.of(name))
      val file         = Files.createTempFile("moodle-attachment", ".tmp")
      Files.write(file, bytes)
      (ct, file, name)
    )

  private def zip(files: Seq[(String, Path, String)]) =
    val tarball = File.createTempFile("moodle-attachments", ".tar.gz").toPath
    val out     = Files.newOutputStream(tarball)
    val bufOut  = new BufferedOutputStream(out)
    val gzOut =
      new CompressorStreamFactory()
        .createCompressorOutputStream(CompressorStreamFactory.GZIP, bufOut)
    val aos = new TarArchiveOutputStream(gzOut)
    aos.setLongFileMode(TarArchiveOutputStream.LONGFILE_POSIX)
    files.foreach(file =>
      val entry = new TarArchiveEntry(file._2.toFile, file._3)
      aos.putArchiveEntry(entry)
      Files.copy(file._2, aos)
      aos.closeArchiveEntry()
    )
    aos.finish()
    aos.close()
    ("application/gzip", tarball, "attachments.tar.gz")

  private def attachment(src: Node, id: Long): Option[Attachment] =
    files(src) match
      case Nil => None
      case files =>
        val (ct, path, name) = if files.length > 1 then zip(files) else files.head
        val newFilePath      = copyFile(path, id)
        Some(fileHandler.createNew(name, ct, newFilePath))

  private def parseFileName(el: Element, attr: String): String =
    s"[Attachment: ${el.attr(attr).dropWhile(_ != '/').tail}]"

  private def parseMedia(html: String, selector: String, attr: String)(
      ff: Element => Boolean
  ): String =
    val doc      = Jsoup.parse(html)
    val elements = doc.select(selector).stream.toScala(List).filter(ff)
    def sourceFn: Element => Element = selector match
      case "audio" | "video" => _.select("source").first
      case "img" | "a"       => identity
    elements.foreach(el => el.replaceWith(new TextNode(parseFileName(sourceFn(el), attr))))
    doc.body.children.toString

  private def stripAttachmentTags(src: String): String =
    val anchorFilter: Element => Boolean = _.attr("href").contains("@@PLUGINFILE@@")
    val mediaFilter: Element => Boolean  = _ => true
    Seq(
      ("img", "src", mediaFilter),
      ("video", "src", mediaFilter),
      ("audio", "src", mediaFilter),
      ("a", "href", anchorFilter)
    ).foldLeft(src) { case (html, (el, attr, fn)) =>
      parseMedia(html, el, attr)(fn)
    }

  private def isHtml(text: String): Boolean =
    val htmlTagPattern = """<[^>]+>""".r
    htmlTagPattern.findFirstIn(text).isDefined

  private def convertCommon(src: Node, user: User, mode: String): Question =
    val srcText  = src \ "questiontext"
    val format   = srcText.head.attribute("format").get.text
    val textNode = srcText \ "text"
    val questionText = format match
      case "html" if isHtml(textNode.text) => textNode.text
      case _                               => "<p>" + textNode.text + "</p>"
    val question = new Question
    question.setQuestion(stripAttachmentTags(questionText))
    question.setTags(tags(src, user).asJava)
    question.setCreatorWithDate(user)
    question.setModifierWithDate(user)
    question.setQuestionOwners(Set(user).asJava)
    val questionType = mode match
      case "essay"                => Question.Type.EssayQuestion
      case "multichoice"          => Question.Type.MultipleChoiceQuestion
      case "weighted-multichoice" => Question.Type.WeightedMultipleChoiceQuestion
    question.setType(questionType)
    question.setState("SAVED")
    question.save()
    attachment(src, question.getId()) match
      case Some(a) =>
        question.setAttachment(a)
        question.save()
        question
      case None => question

  private def convertEssay(src: Node, user: User): Question =
    val question = convertCommon(src, user, mode = "essay")
    val score    = (src \ "defaultgrade").text.toDouble
    question.setDefaultMaxScore(score)
    question.setDefaultEvaluationType(Question.EvaluationType.Points)
    question.update()
    question

  private def optionText(src: Node): String =
    src.attribute("format").get.text match
      case "html" => Jsoup.parse((src \ "text").text).text()
      case _      => (src \ "text").text

  private def convertOption(src: Node): MultipleChoiceOption =
    val isCorrect = src.attribute("fraction").get.text.toDouble == 100d
    val option    = new MultipleChoiceOption
    option.setOption(optionText(src))
    option.setCorrectOption(isCorrect)
    option

  private def convertWeightedOption(src: Node, maxScore: Double): MultipleChoiceOption =
    val fraction = src.attribute("fraction").get.text.toDouble
    val score    = fraction / 100 * maxScore
    val option   = new MultipleChoiceOption
    option.setOption(optionText(src))
    option.setDefaultScore(score)
    option

  private def convertNonWeightedMultiChoice(src: Node, question: Question): Question =
    // question should have a single <answer> with fraction 100, others should have fraction zero
    val score = (src \ "defaultgrade").text.toDouble
    question.setDefaultMaxScore(score)
    val (wrong, rest) = (src \ "answer").map(convertOption).span(!_.isCorrectOption)
    // assert that there is only one correct option
    val checkedOptions = (wrong :+ rest.head) ++ rest.tail.map(o =>
      o.setCorrectOption(false)
      o
    )
    question.setOptions(checkedOptions.asJava)
    question.save()
    question.getOptions.forEach(_.save())
    question

  private def convertWeightedMultiChoice(src: Node, question: Question): Question =
    val maxScore = (src \ "defaultgrade").text.toDouble
    val options  = (src \ "answer").map(node => convertWeightedOption(node, maxScore))
    question.setOptions(options.asJava)
    question.save()
    question.getOptions.forEach(_.save())
    question

  private def convertMultiChoice(src: Node, user: User): Question =
    src \ "single" match
      case s if s.nonEmpty && s.text == "true" =>
        val question = convertCommon(src, user, mode = "multichoice")
        convertNonWeightedMultiChoice(src, question)
      case _ =>
        val question = convertCommon(src, user, mode = "weighted-multichoice")
        convertWeightedMultiChoice(src, question)

  private def convertQuestion(src: Node, user: User): ConversionResult =
    try {
      src.attribute("type").get.text match
        case "essay"       => ConversionResult(Some(convertEssay(src, user)), None, Some("essay"))
        case "multichoice" => ConversionResult(Some(convertMultiChoice(src, user)), None, Some("multichoice"))
        case "category" => // some moodle oddity
          logger.debug("Skipping question of type \"category\" (not a question)")
          ConversionResult(None, None, Some("category"))
        case t =>
          logger.warn(s"unknown question type: $t")
          ConversionResult(None, Some(s"Unknown question type: $t"), Some(t))
    } catch {
      case e: Exception =>
        logger.error(s"Error converting question: ${e.getMessage}", e)
        ConversionResult(None, Some(e.getMessage), src.attribute("type").map(_.text))
    }

  override def convert(data: String, user: User): (Seq[Question], Seq[ConversionResult]) =
    val results = (XML.loadString(data) \ "question").map(convertQuestion(_, user))
    (results.flatMap(_.question), results.filter(_.error.isDefined))
