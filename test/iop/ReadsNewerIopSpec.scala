// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import ch.qos.logback.classic.spi.ILoggingEvent
import ch.qos.logback.classic.{Level, Logger as LogbackLogger}
import ch.qos.logback.core.read.ListAppender
import models.exam.Exam
import models.iop.ExternalExam
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone}
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import org.slf4j.LoggerFactory
import play.api.libs.json.*
import services.iop.IopProtocol
import services.json.JsonDeserializer

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}
import scala.jdk.CollectionConverters.*

/** EXAM 7.0 reading what newer EXAM versions send.
  *
  * Newer code writing something older code cannot read is the most likely way cross-version IOP
  * breaks (the 7.1 timestamp bug was one: 7.0 read them as null). This parses the fixtures of every
  * protocol newer than this branch's with 7.0's own deserializers.
  *
  * Run by dev's `iop-compat` workflow whenever fixtures change, with `IOP_NEWER_FIXTURES` pointing
  * at dev's `test/resources/iop-fixtures`. Without the variable the spec is cancelled, so normal
  * builds are unaffected. To run it by hand: `IOP_NEWER_FIXTURES=<dev>/test/resources/iop-fixtures
  * sbt "testOnly iop.ReadsNewerIopSpec"`
  */
class ReadsNewerIopSpec extends AnyWordSpec with Matchers:

  private val root: Option[Path] = sys.env.get("IOP_NEWER_FIXTURES").map(Paths.get(_))

  private def newerVersions: Seq[Path] = root.toSeq.flatMap { dir =>
    Files
      .list(dir)
      .iterator
      .asScala
      .filter(Files.isDirectory(_))
      .filter(_.getFileName.toString.matches("v\\d+"))
      .filter(_.getFileName.toString.drop(1).toInt > IopProtocol.Version)
      .toSeq
      .sortBy(_.getFileName.toString.drop(1).toInt)
  }

  // Placeholders back to values a deserializer accepts
  private def hydrate(json: JsValue): JsValue =
    var nextId = 0L
    def go(value: JsValue): JsValue = value match
      case JsObject(fields) =>
        JsObject(fields.map {
          case (k, JsString(s)) if s == s"<$k>" && k == "id" =>
            nextId += 1
            k -> JsNumber(nextId)
          case (k, JsString(s)) if s == s"<$k>" && Set("created", "modified")(k) =>
            k -> JsString("2026-01-01T00:00:00.000Z")
          case (k, v) => k -> go(v)
        })
      case JsArray(items) => JsArray(items.map(go))
      case other          => other
    go(json)

  private def fixture(dir: Path, name: String): JsValue =
    hydrate(Json.parse(Files.readString(dir.resolve(s"$name.json"), StandardCharsets.UTF_8)))

  private def jackson(json: JsValue) = play.libs.Json.parse(json.toString)

  private def utc(s: String) = DateTime.parse(s).withZone(DateTimeZone.UTC)

  // 7.0's date adapters only log a warning and return null when they cannot parse a value
  private def parseWarnings[T](block: => T): (T, Seq[String]) =
    val logger   = LoggerFactory.getLogger("services.json").asInstanceOf[LogbackLogger]
    val appender = new ListAppender[ILoggingEvent]()
    val level    = logger.getLevel
    appender.start()
    logger.addAppender(appender)
    logger.setLevel(Level.WARN)
    try
      val result = block
      (result, appender.list.asScala.toSeq.map(_.getFormattedMessage).filter(_.contains("parse")))
    finally
      logger.detachAppender(appender)
      logger.setLevel(level)

  private def readExam(json: JsValue, what: String): Exam =
    val exam = JsonDeserializer.deserialize(classOf[Exam], jackson(json))
    withClue(s"$what: ") {
      exam.name mustBe (json \ "name").as[String]
      exam.examSections.asScala.map(_.sectionQuestions.size).sum must be > 0
    }
    exam

  private def readAll(dir: Path): Unit =
    val enrolment = fixture(dir, "enrolment")
    val exam      = readExam(enrolment, "enrolment")
    (enrolment \ "periodStart").asOpt[String].foreach { s =>
      exam.periodStart.withZone(DateTimeZone.UTC) mustBe utc(s)
    }
    readExam(fixture(dir, "collaborativeExam"), "collaborative exam")
    JsonDeserializer.deserialize(
      classOf[Exam],
      jackson((fixture(dir, "collaborativeAssessment") \ "exam").get)
    ) must not be null

    val transfer = fixture(dir, "assessmentTransfer")
    val ee       = JsonDeserializer.deserialize(classOf[ExternalExam], jackson(transfer))
    withClue("attempt sent home: ") {
      Option(ee.started).map(_.withZone(DateTimeZone.UTC)) mustBe
        Some(utc((transfer \ "started").as[String]))
      Option(ee.finished).map(_.withZone(DateTimeZone.UTC)) mustBe
        Some(utc((transfer \ "finished").as[String]))
    }
    readExam(Json.parse(play.libs.Json.toJson(ee.content).toString), "attempt sent home")

    // As ExternalCalendarController.provideReservation reads them
    val reservation = fixture(dir, "reservationRequest")
    Seq("start", "end").foreach { field =>
      ISODateTimeFormat.dateTimeParser().parseDateTime((reservation \ field).as[String]) must not be
        null
    }

  "EXAM 7.0" should:
    "read what newer EXAM versions send" in:
      assume(root.isDefined, "IOP_NEWER_FIXTURES not set; run by dev's iop-compat workflow")
      val versions = newerVersions
      versions must not be empty
      versions.foreach { dir =>
        withClue(s"${dir.getFileName}: ") {
          val (_, warnings) = parseWarnings(readAll(dir))
          withClue("7.0 could not parse these values, and read them as null: ") {
            warnings mustBe empty
          }
        }
      }
