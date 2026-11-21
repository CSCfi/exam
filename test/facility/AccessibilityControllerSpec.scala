// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import io.ebean.DB
import models.facility.{Accessibility, ExamRoom}
import play.api.http.Status
import play.api.libs.json.{JsObject, Json}
import play.api.test.Helpers.POST

import scala.jdk.CollectionConverters.*

class AccessibilityControllerSpec extends BaseIntegrationSpec:

  private def accessibility(name: String): Accessibility =
    val a = new Accessibility
    a.name = name
    a.save()
    a

  "AccessibilityController" when:
    "adding an item" should:
      "save it" in:
        val (_, session) = runIO(loginAsAdmin())
        val result =
          runIO(makeRequest(
            POST,
            "/app/accessibility",
            Some(Json.obj("name" -> "Ramp")),
            session = session
          ))
        statusOf(result).must(be(Status.OK))
        DB.find(classOf[Accessibility], (contentAsJsonOf(result) \ "id").as[Long]).name
          .must(be("Ramp"))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        val result =
          runIO(makeRequest(
            POST,
            "/app/accessibility",
            Some(Json.obj("name" -> "Ramp")),
            session = session
          ))
        statusOf(result).must(be(Status.FORBIDDEN))

    "renaming an item" should:
      "update its name" in:
        val (_, session) = runIO(loginAsAdmin())
        val ramp         = accessibility("Ramp")

        val body   = Json.obj("id" -> ramp.id.longValue, "name" -> "Wheelchair ramp")
        val result = runIO(put("/app/accessibility", body, session))
        statusOf(result).must(be(Status.OK))
        (contentAsJsonOf(result) \ "name").as[String].must(be("Wheelchair ramp"))
        DB.find(classOf[Accessibility], ramp.id).name.must(be("Wheelchair ramp"))

      "answer 404 for an unknown item" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/accessibility", Json.obj("id" -> 999, "name" -> "x"), session)))
          .must(be(Status.NOT_FOUND))

    "listing items" should:
      "be allowed for students" in:
        val (_, session) = runIO(loginAsStudent())
        accessibility("Ramp")
        accessibility("Lift")

        val result = runIO(get("/app/accessibility", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(a => (a \ "name").as[String]).toSet
          .must(be(Set("Ramp", "Lift")))

    "removing an item" should:
      "detach it from rooms first" in:
        val (_, session) = runIO(loginAsAdmin())
        val ramp         = accessibility("Ramp")
        val lift         = accessibility("Lift")
        val room         = DB.find(classOf[ExamRoom], 1L)
        room.accessibilities.addAll(List(ramp, lift).asJava)
        room.update()

        statusOf(runIO(delete(s"/app/accessibility/${ramp.id}", session))).must(be(Status.OK))
        Option(DB.find(classOf[Accessibility], ramp.id)).must(be(None))
        DB.find(classOf[ExamRoom], 1L).accessibilities.asScala.map(_.name).toList
          .must(be(List("Lift")))

      "answer 404 for an unknown item" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/accessibility/999", session))).must(be(Status.NOT_FOUND))
