// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.ObjectMapper
import database.EbeanJsonExtensions
import features.facility.impl.FacilityHandlerImpl
import features.iop.collaboration.services.CollaborativeExamLoaderService
import features.iop.transfer.services.ExternalExamService
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamParticipation
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.ExternalExam
import models.user.User
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, DateTimeZone}
import org.scalatest.matchers.must.Matchers
import play.api.libs.json.*
import services.iop.IopProtocol
import services.json.JsonDeserializer

import java.nio.charset.StandardCharsets
import java.nio.file.{Files, Paths}
import scala.jdk.CollectionConverters.*

/** Guards the IOP wire format of EXAM 7.0 (protocol 1) against changes in 7.0.x maintenance
  * releases.
  *
  * Each payload 7.0 sends to other installations through XM, built from the shared test data, is
  * compared against `test/resources/iop-fixtures/v1`, which records what 7.0 sends. Other
  * installations rely on that shape, so a 7.0.x release must not change it. A failure means a
  * change here would alter protocol 1; find another way, or coordinate it as a protocol change (see
  * `docs/iop-protocol-versions.md` on dev).
  *
  * The enrolment exam, collaborative exam, collaborative attempt and facility are built by the real
  * service code (private builders are reached through reflection). The attempt sent back home and
  * the reservation request are built inline in AssessmentTransferService and
  * ExternalCalendarController, so they are reproduced here: model changes are still caught, an edit
  * to those inline lines is not.
  *
  * A change only shows if the test data contains what changed: dropping a relation the test exams
  * don't have (e.g. a feedback config) goes unnoticed.
  *
  * dev has its own version of this spec (protocol 2 onwards); keep dev's on a merge.
  */
class IopPayloadFixturesSpec extends BaseIntegrationSpec with Matchers with EbeanJsonExtensions:

  private val fixtureDir = Paths.get("test", "resources", "iop-fixtures", "v1")

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

  private def fixture(name: String): JsValue =
    Json.parse(Files.readString(fixtureDir.resolve(s"$name.json"), StandardCharsets.UTF_8))

  private def check(name: String, payload: JsValue): Unit =
    withClue(
      s"The IOP payload '$name' no longer matches $fixtureDir/$name.json. EXAM 7.0 is protocol " +
        "1, and other installations rely on what it sends; a 7.0.x release must not change it. " +
        "See the class comment.\n"
    ) {
      normalise(payload) mustBe fixture(name)
    }

  private def callPrivate[T](target: AnyRef, name: String, args: AnyRef*): T =
    val method = target.getClass.getDeclaredMethods.find(_.getName == name).getOrElse {
      fail(s"${target.getClass.getSimpleName}.$name not found: the IOP payload builder moved")
    }
    method.setAccessible(true)
    method.invoke(target, args*).asInstanceOf[T]

  private val fixed = new DateTime(2026, 1, 15, 9, 0, DateTimeZone.UTC)

  "IOP payloads of EXAM 7.0" should:
    "be protocol 1" in:
      IopProtocol.Version mustBe 1

    "match the protocol 1 fixtures" in:
      ensureTestDataLoaded()
      val exam = DB
        .find(classOf[Exam])
        .findList()
        .asScala
        .maxBy(e => (e.examSections.asScala.map(_.sectionQuestions.size).sum, -e.id))

      val externalExams = app.injector.instanceOf[ExternalExamService]
      val enrolmentPath = callPrivate[PathProperties](externalExams, "getPath")
      check("enrolment", exam.asJson(enrolmentPath))

      val loader = app.injector.instanceOf[CollaborativeExamLoaderService]
      check("collaborativeExam", callPrivate[JsValue](loader, "serializeForUpdate", exam, "1-abc"))

      val participation =
        DB.find(classOf[ExamParticipation]).orderBy("id").findList().asScala.head
      check(
        "collaborativeAssessment",
        Json.parse(DB.json().toJson(participation, loader.getAssessmentPath))
      )

      // As AssessmentTransferService.send builds it
      val ee = new ExternalExam()
      ee.creator = DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").findOne()
      ee.externalRef = "home-exam-hash"
      ee.hash = "local-exam-hash"
      ee.created = fixed
      ee.started = fixed
      ee.finished = fixed.plusSeconds(5400)
      ee.save()
      ee.serialize(exam)
      val transfer = new ObjectMapper()
        .readTree(DB.json.toJson(ee, PathProperties.parse("(*, creator(id))")))
        .toString
      check("assessmentTransfer", Json.parse(transfer))

      val room       = DB.find(classOf[ExamRoom]).where().eq("roomCode", "IT101").findOne()
      val facilities = app.injector.instanceOf[FacilityHandlerImpl]
      check("facility", Json.parse(callPrivate[String](facilities, "toJson", room)))

      // As ExternalCalendarController.requestReservation builds it
      check(
        "reservationRequest",
        Json.obj(
          "requestingOrg"    -> "home-org-ref",
          "start"            -> ISODateTimeFormat.dateTime().print(fixed),
          "end"              -> ISODateTimeFormat.dateTime().print(fixed.plusHours(1)),
          "user"             -> "student@funet.fi",
          "email"            -> "student@funet.fi",
          "optionalSections" -> Json.toJson(Seq(1L, 2L))
        )
      )

    "read the protocol 1 fixtures back" in:
      // Placeholders back to values the deserializer accepts
      var nextId = 0L
      def hydrate(value: JsValue): JsValue = value match
        case JsObject(fields) =>
          JsObject(fields.map {
            case (k, JsString(s)) if s == s"<$k>" && k == "id" =>
              nextId += 1
              k -> JsNumber(nextId)
            case (k, JsString(s)) if s == s"<$k>" && Set("created", "modified")(k) =>
              k -> JsString("2026-01-01T00:00:00.000Z")
            case (k, v) => k -> hydrate(v)
          })
        case JsArray(items) => JsArray(items.map(hydrate))
        case other          => other

      def parseExam(json: JsValue): Exam =
        val exam = JsonDeserializer.deserialize(classOf[Exam], play.libs.Json.parse(json.toString))
        exam.name mustBe (json \ "name").as[String]
        exam.examSections.asScala.map(_.sectionQuestions.size).sum must be > 0
        exam

      val enrolment = hydrate(fixture("enrolment"))
      parseExam(enrolment).periodStart must not be null
      parseExam(hydrate(fixture("collaborativeExam")))
      val transfer = hydrate(fixture("assessmentTransfer"))
      val ee = JsonDeserializer.deserialize(
        classOf[ExternalExam],
        play.libs.Json.parse(transfer.toString)
      )
      ee.started must not be null
      ee.finished must not be null
      parseExam(Json.parse(play.libs.Json.toJson(ee.content).toString))
