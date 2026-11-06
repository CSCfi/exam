// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import io.ebean.DB
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.ExternalExam
import models.user.User
import org.scalatest.matchers.must.Matchers
import play.api.libs.json.*
import services.iop.{IopPayloads, IopProtocol}
import services.json.JsonDeserializer

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Path, Paths}
import java.time.Instant
import scala.jdk.CollectionConverters.*

/** Locks the IOP wire format: what this installation sends to others through XM.
  *
  * Each payload built by [[IopPayloads]] from the shared test data is compared against a committed
  * fixture under `test/resources/iop-fixtures/v<IopProtocol.Version>`. A failure means the protocol
  * changed. If that was intended, bump `IopProtocol.Version`, regenerate the fixtures with
  * `IOP_FIXTURES_UPDATE=1 sbt "testOnly iop.IopPayloadFixturesSpec"` and add the matching
  * translation step to XM. The fixtures are copied to XM's tests, so XM is checked against the same
  * shapes.
  */
class IopPayloadFixturesSpec extends BaseIntegrationSpec with Matchers:

  private val fixtureRoot: Path = Paths.get("test", "resources", "iop-fixtures")
  private val fixtureDir: Path  = fixtureRoot.resolve(s"v${IopProtocol.Version}")

  private val updating = sys.env.get("IOP_FIXTURES_UPDATE").contains("1")

  // Values that differ from run to run, replaced so the fixtures stay stable
  private val Volatile = Set("id", "hash", "created", "modified", "externalRef", "rev", "_rev")

  private def normalise(json: JsValue): JsValue = json match
    case JsObject(fields) =>
      JsObject(fields.toSeq.sortBy(_._1).map {
        case (k, v) if Volatile(k) && v != JsNull => k -> JsString(s"<$k>")
        case (k, v)                               => k -> normalise(v)
      })
    case JsArray(items) => JsArray(items.map(normalise))
    case other          => other

  private def check(name: String, payload: JsValue): Unit =
    val file   = fixtureDir.resolve(s"$name.json")
    val actual = normalise(payload)
    if updating then
      Files.createDirectories(fixtureDir)
      Files.writeString(file, Json.prettyPrint(actual) + "\n", StandardCharsets.UTF_8)
    else
      withClue(
        s"$file is missing. Generate it with IOP_FIXTURES_UPDATE=1 (see the class comment)."
      ) {
        Files.exists(file) mustBe true
      }
      val expected = Json.parse(Files.readString(file, StandardCharsets.UTF_8))
      withClue(
        s"The IOP payload '$name' no longer matches $file. This changes the protocol " +
          "between EXAM installations; see the class comment for what to do.\n"
      ) {
        actual mustBe expected
      }

  // The richest exam in the test data: most section questions
  private def richExam: Exam =
    DB.find(classOf[Exam])
      .findList()
      .asScala
      .maxBy(e => (e.examSections.asScala.map(_.sectionQuestions.size).sum, -e.id))

  private def participation: ExamParticipation =
    DB.find(classOf[ExamParticipation]).orderBy("id").findList().asScala.head

  private def room: ExamRoom =
    DB.find(classOf[ExamRoom]).where().eq("roomCode", "IT101").findOne()

  private val fixedTime = Instant.parse("2026-01-15T09:00:00Z")

  private def externalExam(exam: Exam): ExternalExam =
    val ee = new ExternalExam()
    ee.creator = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").findOne()
    ee.externalRef = "home-exam-hash"
    ee.hash = "local-exam-hash"
    ee.created = fixedTime
    ee.started = fixedTime
    ee.finished = fixedTime.plusSeconds(5400)
    ee.save()
    ee.serialize(exam)
    ee

  "IOP payloads" should:
    "match the fixtures of the current protocol version" in:
      ensureTestDataLoaded()
      val exam = richExam
      check("enrolment", IopPayloads.enrolment(exam))
      check("collaborativeExam", IopPayloads.collaborativeExam(exam, "1-abc"))
      check(
        "collaborativeAssessment",
        Json.parse(IopPayloads.collaborativeAssessment(participation))
      )
      check("assessmentTransfer", Json.parse(IopPayloads.assessmentTransfer(externalExam(exam))))
      check("facility", Json.parse(IopPayloads.facility(room)))
      check(
        "reservationRequest",
        IopPayloads.reservationRequest(
          "home-org-ref",
          fixedTime,
          fixedTime.plusSeconds(3600),
          "student@funet.fi",
          "student@funet.fi",
          Seq(1L, 2L)
        )
      )
      if updating then fail(s"Fixtures written to $fixtureDir; review and commit them, then rerun")

    "still be readable from every protocol version's fixtures" in:
      val versions = Files.list(fixtureRoot).iterator.asScala.filter(Files.isDirectory(_)).toSeq
      versions must not be empty
      versions.sortBy(_.getFileName.toString).foreach { dir =>
        withClue(s"${dir.getFileName}: ") {
          // Visiting student's exam, read at the examination site
          checkExam(fixture(dir, "enrolment"), dir, "enrolment")
          // Collaborative exam, read from XM
          checkExam(fixture(dir, "collaborativeExam"), dir, "collaborativeExam")
          // Attempt sent back to the student's home organisation
          val ee = JsonDeserializer.deserialize(
            classOf[ExternalExam],
            play.libs.Json.parse(fixture(dir, "assessmentTransfer").toString)
          )
          ee.content must not be null
          checkExam(
            Json.parse(play.libs.Json.toJson(ee.content).toString),
            dir,
            "assessmentTransfer"
          )
          Option(ee.started) must be(defined)
          Option(ee.finished) must be(defined)
        }
      }

  // Placeholders back to values the deserializers accept
  private def hydrate(json: JsValue): JsValue =
    var nextId = 0L
    def go(value: JsValue): JsValue = value match
      case JsObject(fields) =>
        JsObject(fields.map {
          case (k, JsString(s)) if s == s"<$k>" && k == "id" =>
            nextId += 1
            k -> JsNumber(nextId)
          case (k, JsString(s)) if s == s"<$k>" && Set("created", "modified")(k) =>
            k -> JsString("2026-01-01T00:00:00Z")
          case (k, v) => k -> go(v)
        })
      case JsArray(items) => JsArray(items.map(go))
      case other          => other
    go(json)

  private def fixture(dir: Path, name: String): JsValue =
    hydrate(Json.parse(Files.readString(dir.resolve(s"$name.json"), StandardCharsets.UTF_8)))

  private def questionCount(json: JsValue): Int =
    (json \\ "sectionQuestions").map(_.as[JsArray].value.size).sum

  /** Parses the exam the way a receiving installation does and checks its structure survived */
  private def checkExam(json: JsValue, dir: Path, name: String): Unit =
    withClue(s"$name: ") {
      val exam = JsonDeserializer.deserialize(classOf[Exam], play.libs.Json.parse(json.toString))
      exam.name mustBe (json \ "name").as[String]
      exam.examSections.size mustBe (json \ "examSections").as[JsArray].value.size
      // The fixtures come from an exam with questions; none parsed means a field went missing
      val parsed = exam.examSections.asScala.map(_.sectionQuestions.size).sum
      parsed must be > 0
      parsed mustBe questionCount(json)
      exam.examSections.asScala
        .flatMap(_.sectionQuestions.asScala)
        .foreach(esq => Option(esq.question) must be(defined))
    }
