// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.Reservation
import models.facility.{ExamMachine, ExamRoom, Software}
import play.api.http.Status
import play.api.libs.json.{JsObject, Json}
import play.api.mvc.Session

import java.time.Instant
import java.time.temporal.ChronoUnit
import scala.jdk.CollectionConverters.*

class ExamMachineControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def machine(name: String): ExamMachine =
    DB.find(classOf[ExamMachine]).where().eq("name", name).find.get

  private def software(name: String): Software =
    DB.find(classOf[Software]).where().eq("name", name).find.get

  private def softwareOf(m: ExamMachine): Set[String] =
    DB.find(classOf[ExamMachine], m.id).softwareInfo.asScala.map(_.name).toSet

  private def createSoftware(name: String): Software =
    val software = new Software
    software.name = name
    software.save()
    software

  private def softwareNames(session: Session): Set[String] =
    val result = runIO(get("/app/softwares", session = session))
    statusOf(result).must(be(Status.OK))
    contentAsJsonOf(result).as[Seq[JsObject]].map(s => (s \ "name").as[String]).toSet

  "ExamMachineController" when:
    "listing software" should:
      "list all software" in:
        val (_, session) = runIO(loginAsAdmin())
        createSoftware("Probe one")
        createSoftware("Probe two")

        softwareNames(session).filter(_.startsWith("Probe")).must(be(Set("Probe one", "Probe two")))

    "removing software" should:
      "free its name for reuse" in:
        val (_, session) = runIO(loginAsAdmin())
        val software     = createSoftware("Probe")

        statusOf(runIO(delete(s"/app/softwares/${software.id}", session))).must(be(Status.OK))
        softwareNames(session).must(not(contain("Probe")))
        statusOf(runIO(post("/app/softwares/Probe", session))).must(be(Status.OK))
        softwareNames(session).must(contain("Probe"))

    "naming software" should:
      "reject a name already in use regardless of case" in:
        val (_, session) = runIO(loginAsAdmin())
        val software     = createSoftware("Probe")
        createSoftware("Other probe")

        statusOf(runIO(post("/app/softwares/PROBE", session))).must(be(Status.BAD_REQUEST))
        statusOf(runIO(put(
          s"/app/softwares/${software.id}/OTHER%20PROBE",
          JsObject.empty,
          session
        )))
          .must(be(Status.BAD_REQUEST))

      "allow changing the case of its own name" in:
        val (_, session) = runIO(loginAsAdmin())
        val software     = createSoftware("probe")

        statusOf(runIO(put(s"/app/softwares/${software.id}/Probe", JsObject.empty, session)))
          .must(be(Status.OK))
        softwareNames(session).must(contain("Probe"))

      "answer 404 for an unknown software" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/softwares/999/Probe", JsObject.empty, session)))
          .must(be(Status.NOT_FOUND))

    "getting software" should:
      "return it to a teacher" in:
        val (_, session) = runIO(loginAsTeacher())
        val result = runIO(get(s"/app/softwares/${software("Firefox").id}", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "name").as[String].must(be("Firefox"))

      "answer 404 for an unknown software" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get("/app/softwares/999", session = session))).must(be(Status.NOT_FOUND))
        val (_, admin) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/softwares/999", admin))).must(be(Status.NOT_FOUND))

    "listing machines" should:
      "leave out archived and unnamed machines" in:
        val (_, session) = runIO(loginAsAdmin())
        val archived     = machine("Pegasus 02")
        archived.archived = true
        archived.update()
        new ExamMachine().save()

        val result = runIO(get("/app/machines", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(m => (m \ "name").asOpt[String])
          .must(be(Seq(Some("Pegasus 01"), Some("Pegasus 03"))))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get("/app/machines", session = session))).must(be(Status.FORBIDDEN))

    "getting a machine" should:
      "include its software and room" in:
        val (_, session) = runIO(loginAsStudent())
        val result = runIO(get(s"/app/machines/${machine("Pegasus 01").id}", session = session))
        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        (json \ "room" \ "name").as[String].must(be("Tenttiakvaario Pegasus"))
        (json \ "softwareInfo").as[Seq[JsObject]].map(s => (s \ "name").as[String]).toSet
          .must(be(Set("Matematica", "Firefox")))

      "answer 404 for an unknown machine" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get("/app/machines/999", session = session))).must(be(Status.NOT_FOUND))

    "listing a machine's reservations" should:
      "only list those that have not ended" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        val now          = Instant.now().truncatedTo(ChronoUnit.SECONDS)
        val upcoming     = new Reservation
        upcoming.startAt = now.plus(1, ChronoUnit.DAYS)
        upcoming.endAt = now.plus(1, ChronoUnit.DAYS).plus(2, ChronoUnit.HOURS)
        upcoming.machine = m
        upcoming.save()

        val result = runIO(get(s"/app/machines/${m.id}/reservations", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(r => (r \ "id").as[Long])
          .must(be(Seq(upcoming.id.longValue)))

    "updating a machine" should:
      "update the given fields" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        val body = Json.obj(
          "name"          -> "Pegasus 1",
          "ipAddress"     -> "10.0.0.1",
          "outOfService"  -> true,
          "statusComment" -> "Broken keyboard"
        )

        val result = runIO(put(s"/app/machines/${m.id}", body, session))
        statusOf(result).must(be(Status.OK))
        val updated = DB.find(classOf[ExamMachine], m.id)
        (updated.name, updated.ipAddress, updated.outOfService, updated.statusComment)
          .must(be(("Pegasus 1", "10.0.0.1", true, "Broken keyboard")))
        updated.surveillanceCamera.must(be("CAM-001"))

      "keep its own IP address" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        statusOf(runIO(put(
          s"/app/machines/${m.id}",
          Json.obj("ipAddress" -> m.ipAddress),
          session
        )))
          .must(be(Status.OK))

      "refuse an IP address another machine has" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        val body = Json.obj("name" -> "Changed", "ipAddress" -> machine("Pegasus 02").ipAddress)

        val result = runIO(put(s"/app/machines/${m.id}", body, session))
        statusOf(result).must(be(Status.FORBIDDEN))
        contentAsStringOf(result).must(be("i18n_error_ip_address_exists_for_room"))
        machine("Pegasus 01").name.must(be("Pegasus 01"))

      "answer 404 for an unknown machine" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/machines/999", Json.obj("name" -> "x"), session)))
          .must(be(Status.NOT_FOUND))

    "toggling machine software" should:
      "turn it on and off" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        val excel        = software("Excel")
        def toggle() =
          val result = runIO(post(s"/app/machine/${m.id}/software/${excel.id}", session))
          statusOf(result).must(be(Status.OK))
          (contentAsJsonOf(result) \ "turnedOn").as[Boolean]

        toggle().must(be(true))
        softwareOf(m).must(contain("Excel"))
        toggle().must(be(false))
        softwareOf(m).must(not(contain("Excel")))

      "answer 404 for an unknown machine or software" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        statusOf(runIO(post(s"/app/machine/999/software/${software("Excel").id}", session)))
          .must(be(Status.NOT_FOUND))
        statusOf(runIO(post(s"/app/machine/${m.id}/software/999", session)))
          .must(be(Status.NOT_FOUND))

    "resetting machine software" should:
      "remove all of it" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 02")
        statusOf(runIO(put(s"/app/software_machine/${m.id}", JsObject.empty, session)))
          .must(be(Status.OK))
        softwareOf(m).must(be(empty))

      "answer 404 for an unknown machine" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/software_machine/999", JsObject.empty, session)))
          .must(be(Status.NOT_FOUND))

    "adding a machine" should:
      "add an empty machine to the room" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(post("/app/machines/1", session))
        statusOf(result).must(be(Status.OK))

        val added = DB.find(classOf[ExamMachine], (contentAsJsonOf(result) \ "id").as[Long])
        added.room.id.longValue.must(be(1L))
        DB.find(classOf[ExamRoom], 1L).examMachines.size.must(be(4))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(post("/app/machines/999", session))).must(be(Status.NOT_FOUND))

    "removing a machine" should:
      "not be allowed" in:
        val (_, session) = runIO(loginAsAdmin())
        val m            = machine("Pegasus 01")
        statusOf(runIO(delete(s"/app/machines/${m.id}", session))).must(be(Status.FORBIDDEN))
        Option(DB.find(classOf[ExamMachine], m.id)).must(not(be(None)))
