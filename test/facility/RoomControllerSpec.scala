// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.calendar.{DefaultWorkingHours, ExceptionWorkingHours}
import models.facility.*
import play.api.http.Status
import play.api.libs.json.{JsObject, JsValue, Json}
import play.api.mvc.Session
import play.api.test.Helpers.POST
import services.cache.FacilityCache

import java.time.LocalTime
import scala.jdk.CollectionConverters.*

class RoomControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def room(): ExamRoom = DB.find(classOf[ExamRoom], 1L)

  private def postJson(path: String, body: JsValue, session: Session) =
    runIO(makeRequest(POST, path, Some(body), session = session))

  private def otherRoom(name: String, state: ExamRoom.State = ExamRoom.State.ACTIVE): ExamRoom =
    val r = new ExamRoom
    r.name = name
    r.state = state.toString
    r.save()
    r

  private def workingHours(): List[DefaultWorkingHours] =
    DB.find(classOf[DefaultWorkingHours]).where().eq("room.id", 1L).list

  private def addWorkingHours(session: Session, start: String, end: String, rooms: Long*) =
    postJson(
      "/app/workinghours",
      Json.obj(
        "roomIds"      -> rooms,
        "workingHours" -> Json.obj("weekday" -> "Monday", "startTime" -> start, "endTime" -> end)
      ),
      session
    )

  private def listRooms(session: Session): Seq[JsObject] =
    val result = runIO(get("/app/rooms", session = session))
    statusOf(result).must(be(Status.OK))
    contentAsJsonOf(result).as[Seq[JsObject]]

  "RoomController" when:
    "disabling a room" should:
      "set room state to INACTIVE" in:
        val (_, session) = runIO(loginAsAdmin())
        room().state must not be ExamRoom.State.INACTIVE.toString

        val result = runIO(delete("/app/rooms/1", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "state").as[String].must(be(ExamRoom.State.INACTIVE.toString))
        room().state.must(be(ExamRoom.State.INACTIVE.toString))

      "withdraw a shared room from XM" in:
        val (_, session) = runIO(loginAsAdmin())
        val r            = room()
        r.externalRef = "facility-1"
        r.update()
        val xm = FakeFacilityXm()

        FakeFacilityXm.running(xm) {
          statusOf(runIO(delete("/app/rooms/1", session = session))).must(be(Status.OK))
        }
        xm.requests.map(r => (r.method, r.path))
          .must(be(List("DELETE" -> "/api/organisations/test-org/facilities/facility-1")))
        Option(room().externalRef).must(be(None))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/rooms/999", session = session))).must(be(Status.NOT_FOUND))

    "enabling a room" should:
      "set room state to ACTIVE" in:
        val (_, session) = runIO(loginAsAdmin())
        val r            = room()
        r.state = ExamRoom.State.INACTIVE.toString
        r.update()

        val result = runIO(post("/app/rooms/1", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "state").as[String].must(be(ExamRoom.State.ACTIVE.toString))
        room().state.must(be(ExamRoom.State.ACTIVE.toString))

    "listing rooms" should:
      "hide inactive rooms from others than admins" in:
        val (_, adminSession) = runIO(loginAsAdmin())
        otherRoom("Closed room", ExamRoom.State.INACTIVE)
        listRooms(adminSession).map(r => (r \ "name").as[String]).must(contain("Closed room"))

        val (_, studentSession) = runIO(loginAsStudent())
        listRooms(studentSession).map(r => (r \ "name").as[String])
          .must(not(contain("Closed room")))

      "tell which passwords are required without revealing them" in:
        val (_, session) = runIO(loginAsStudent())
        val r            = room()
        r.internalPassword = "secret"
        r.update()

        val listed = listRooms(session).find(r => (r \ "id").as[Long] == 1L).get
        (listed \ "internalPasswordRequired").as[Boolean].must(be(true))
        (listed \ "externalPasswordRequired").as[Boolean].must(be(false))
        listed.keys.must(not(contain("internalPassword")))

      "leave out archived machines" in:
        val (_, session) = runIO(loginAsAdmin())
        val archived     = new ExamMachine
        archived.name = "Pegasus old"
        archived.archived = true
        archived.room = room()
        archived.save()

        val listed   = listRooms(session).find(r => (r \ "id").as[Long] == 1L).get
        val machines = (listed \ "examMachines").as[Seq[JsObject]].map(m => (m \ "name").as[String])
        machines.must(contain("Pegasus 01"))
        machines.must(not(contain("Pegasus old")))

    "getting a room" should:
      "return it to an admin" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(get("/app/rooms/1", session = session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "name").as[String].must(be("Tenttiakvaario Pegasus"))
        (contentAsJsonOf(result) \ "mailAddress" \ "city").as[String].must(be("Oulu"))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(get("/app/rooms/999", session = session))).must(be(Status.NOT_FOUND))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(runIO(get("/app/rooms/1", session = session))).must(be(Status.FORBIDDEN))

    "creating a room draft" should:
      "save a room with an address and the default time zone" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = runIO(get("/app/draft/rooms", session = session))
        statusOf(result).must(be(Status.OK))

        val draft = DB.find(classOf[ExamRoom], (contentAsJsonOf(result) \ "id").as[Long])
        draft.state.must(be("SAVED"))
        draft.localTimezone.must(be("Europe/Helsinki"))
        Option(draft.mailAddress).map(_.id).must(not(be(None)))

    "updating a room" should:
      "update the given fields and trim the passwords" in:
        val (_, session) = runIO(loginAsAdmin())
        val body = Json.obj(
          "name"             -> "Pegasus II",
          "outOfService"     -> true,
          "internalPassword" -> "  secret ",
          "externalPassword" -> "   "
        )
        val r = room()
        r.externalPassword = "old"
        r.update()

        statusOf(runIO(put("/app/rooms/1", body, session))).must(be(Status.OK))
        val updated = room()
        updated.name.must(be("Pegasus II"))
        updated.outOfService.must(be(true))
        updated.roomCode.must(be("IT101"))
        updated.internalPassword.must(be("secret"))
        Option(updated.externalPassword).must(be(None))

      "send a shared room to XM" in:
        val (_, session) = runIO(loginAsAdmin())
        val r            = room()
        r.externalRef = "facility-1"
        r.update()
        val xm = FakeFacilityXm()

        FakeFacilityXm.running(xm) {
          statusOf(runIO(put("/app/rooms/1", Json.obj("name" -> "Shared"), session)))
            .must(be(Status.OK))
        }
        xm.requests.size.must(be(1))
        val sent = xm.requests.head
        (sent.method, sent.path).must(
          be("PUT" -> "/api/organisations/test-org/facilities/facility-1")
        )
        (Json.parse(sent.body) \ "name").as[String].must(be("Shared"))

      "save the room even when XM is unreachable" in:
        val (_, session) = runIO(loginAsAdmin())
        val r            = room()
        r.externalRef = "facility-1"
        r.update()

        statusOf(runIO(put("/app/rooms/1", Json.obj("name" -> "Offline"), session)))
          .must(be(Status.OK))
        room().name.must(be("Offline"))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/rooms/999", Json.obj("name" -> "x"), session)))
          .must(be(Status.NOT_FOUND))

    "updating a room address" should:
      "update the address" in:
        val (_, session) = runIO(loginAsAdmin())
        val addressId    = room().mailAddress.id
        val body         = Json.obj("street" -> "Kauppakatu 2", "zip" -> "20100", "city" -> "Turku")

        statusOf(runIO(put(s"/app/address/$addressId", body, session))).must(be(Status.OK))
        val address = DB.find(classOf[MailAddress], addressId)
        (address.street, address.zip, address.city).must(be(("Kauppakatu 2", "20100", "Turku")))

      "answer 404 for an unknown address" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/address/999", Json.obj("city" -> "x"), session)))
          .must(be(Status.NOT_FOUND))

      "answer 404 for an address without a room" in:
        val (_, session) = runIO(loginAsAdmin())
        val address      = new MailAddress
        address.save()
        statusOf(runIO(put(s"/app/address/${address.id}", Json.obj("city" -> "x"), session)))
          .must(be(Status.NOT_FOUND))

    "checking a room password" should:
      "accept the room's own password only" in:
        val (_, session) = runIO(loginAsStudent())
        val r            = room()
        r.internalPassword = "secret"
        r.update()

        statusOf(postJson("/app/rooms/1/validate", Json.obj("password" -> "secret"), session))
          .must(be(Status.OK))
        statusOf(postJson("/app/rooms/1/validate", Json.obj("password" -> "guess"), session))
          .must(be(Status.FORBIDDEN))
        statusOf(postJson("/app/rooms/1/validate", Json.obj(), session))
          .must(be(Status.FORBIDDEN))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(postJson("/app/rooms/999/validate", Json.obj("password" -> "x"), session))
          .must(be(Status.NOT_FOUND))

      "check an external facility against the cached password" in:
        val (_, session) = runIO(loginAsStudent())
        app.injector.instanceOf(classOf[FacilityCache]).storeFacilityPassword("ext-1", "remote")
        def check(body: JsObject) =
          statusOf(postJson("/app/rooms/0/validate", body ++ Json.obj("external" -> true), session))

        check(Json.obj("facilityId" -> "ext-1", "password" -> "remote")).must(be(Status.OK))
        check(Json.obj("facilityId" -> "ext-1", "password" -> "guess")).must(be(Status.FORBIDDEN))
        check(Json.obj("facilityId" -> "ext-2", "password" -> "remote"))
          .must(be(Status.NOT_FOUND))
        check(Json.obj("password" -> "remote")).must(be(Status.BAD_REQUEST))

    "setting opening hours" should:
      "replace the hours they overlap" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(addWorkingHours(session, "8:00", "12:00", 1L)).must(be(Status.OK))
        statusOf(addWorkingHours(session, "13:00", "15:00", 1L)).must(be(Status.OK))
        statusOf(addWorkingHours(session, "11:00", "14:00", 1L)).must(be(Status.OK))

        workingHours().map(h => (h.startTime, h.endTime))
          .must(be(List(LocalTime.of(11, 0) -> LocalTime.of(14, 0))))

      "answer with the id of the saved hours" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = addWorkingHours(session, "8:00", "12:00", 1L)
        (contentAsJsonOf(result) \ "id").as[Long].must(be(workingHours().head.id.longValue))

    "removing opening hours" should:
      "delete them" in:
        val (_, session) = runIO(loginAsAdmin())
        addWorkingHours(session, "8:00", "12:00", 1L)
        val id = workingHours().head.id

        statusOf(runIO(delete(s"/app/workinghours/1/$id", session))).must(be(Status.OK))
        workingHours().must(be(empty))

      "refuse unknown hours" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/workinghours/1/999", session))).must(be(Status.FORBIDDEN))

    "setting starting hours" should:
      "replace the previous ones in each room" in:
        val (_, session) = runIO(loginAsAdmin())
        val second       = otherRoom("Second room")
        def startingHours(roomId: Long) =
          DB.find(classOf[ExamStartingHour]).where().eq("room.id", roomId).list
            .map(_.startingHour).sorted
        def set(hours: String*) =
          val body = Json.obj("roomIds" -> Seq(1L, second.id.longValue), "hours" -> hours)
          statusOf(runIO(put("/app/startinghours", body, session))).must(be(Status.OK))

        set("8:00", "9:30")
        set("10:15")
        startingHours(1L).must(be(List(LocalTime.of(10, 15))))
        startingHours(second.id).must(be(List(LocalTime.of(10, 15))))

    "adding exception hours" should:
      "add them to each room" in:
        val (_, session) = runIO(loginAsAdmin())
        val second       = otherRoom("Second room")
        val body = Json.obj(
          "roomIds" -> Seq(1L, second.id.longValue),
          "exceptions" -> Json.arr(Json.obj(
            "startDate" -> "2030-06-12T08:00:00Z",
            "endDate"   -> "2030-06-12T12:00:00Z"
          ))
        )

        val result = runIO(put("/app/exception", body, session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].size.must(be(2))
        val saved = DB.find(classOf[ExceptionWorkingHours]).list
        saved.map(_.room.id.longValue).toSet.must(be(Set(1L, second.id.longValue)))
        saved.forall(_.outOfService).must(be(true))

    "removing exception hours" should:
      "delete them" in:
        val (_, session) = runIO(loginAsAdmin())
        val exception    = new ExceptionWorkingHours
        exception.startDate = new java.util.Date()
        exception.endDate = new java.util.Date()
        exception.room = room()
        exception.save()

        statusOf(runIO(delete(s"/app/rooms/1/exception/${exception.id}", session)))
          .must(be(Status.OK))
        Option(DB.find(classOf[ExceptionWorkingHours], exception.id)).must(be(None))

      "answer 404 for unknown hours" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/rooms/1/exception/999", session))).must(be(Status.NOT_FOUND))

    "setting room accessibility" should:
      "replace the room's accessibility items" in:
        val (_, session) = runIO(loginAsAdmin())
        val Seq(ramp, lift) = Seq("Ramp", "Lift").map { name =>
          val a = new Accessibility
          a.name = name
          a.save()
          a
        }
        def accessibilities = room().accessibilities.asScala.map(_.name).toSet
        def set(ids: String) =
          statusOf(postJson("/app/room/1/accessibility", Json.obj("ids" -> ids), session))
            .must(be(Status.OK))

        set(s"${ramp.id}, ${lift.id}")
        accessibilities.must(be(Set("Ramp", "Lift")))
        set(s"${lift.id}")
        accessibilities.must(be(Set("Lift")))
        set("")
        accessibilities.must(be(empty))

      "answer 404 for an unknown room" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(postJson("/app/room/999/accessibility", Json.obj("ids" -> ""), session))
          .must(be(Status.NOT_FOUND))
