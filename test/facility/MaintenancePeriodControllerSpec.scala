// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import io.ebean.DB
import models.calendar.MaintenancePeriod
import play.api.http.Status
import play.api.libs.json.{JsObject, JsValue, Json}
import play.api.mvc.{Result, Session}
import play.api.test.Helpers.POST

import java.time.Instant
import java.time.temporal.ChronoUnit

class MaintenancePeriodControllerSpec extends BaseIntegrationSpec:

  private val now = Instant.now().truncatedTo(ChronoUnit.SECONDS)

  private def period(description: String, startsAt: Instant, endsAt: Instant): MaintenancePeriod =
    val p = new MaintenancePeriod
    p.description = description
    p.startsAt = startsAt
    p.endsAt = endsAt
    p.save()
    p

  private def body(description: String, startsAt: Instant, endsAt: Instant): JsObject =
    Json.obj(
      "description" -> description,
      "startsAt"    -> startsAt.toString,
      "endsAt"      -> endsAt.toString
    )

  private def create(json: JsValue, session: Session): Result =
    runIO(makeRequest(POST, "/app/maintenance", Some(json), session = session))

  // Every change sends XM all periods
  private def sentDescriptions(xm: FakeFacilityXm): List[Set[String]] =
    xm.requests.map { r =>
      (r.method, r.path).must(be("PUT" -> "/api/organisations/test-org"))
      (Json.parse(r.body) \ "maintenancePeriods").as[Seq[JsObject]]
        .map(p => (p \ "description").as[String]).toSet
    }

  "MaintenancePeriodController" when:
    "listing periods" should:
      "list only those that have not ended" in:
        val (_, session) = runIO(loginAsStudent())
        period("Past", now.minus(3, ChronoUnit.DAYS), now.minus(2, ChronoUnit.DAYS))
        period("Ongoing", now.minus(1, ChronoUnit.HOURS), now.plus(1, ChronoUnit.HOURS))
        period("Upcoming", now.plus(1, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS))

        val result = runIO(get("/app/maintenance", session = session))
        statusOf(result).must(be(Status.OK))
        contentAsJsonOf(result).as[Seq[JsObject]].map(p => (p \ "description").as[String]).toSet
          .must(be(Set("Ongoing", "Upcoming")))

    "creating a period" should:
      "save it and send all periods to XM" in:
        val (_, session) = runIO(loginAsAdmin())
        period("Earlier", now.plus(1, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS))
        val xm = FakeFacilityXm()

        val result = FakeFacilityXm.running(xm) {
          create(
            body("Upgrade", now.plus(3, ChronoUnit.DAYS), now.plus(4, ChronoUnit.DAYS)),
            session
          )
        }
        statusOf(result).must(be(Status.CREATED))
        val saved = DB.find(classOf[MaintenancePeriod], (contentAsJsonOf(result) \ "id").as[Long])
        (saved.description, saved.startsAt, saved.endsAt)
          .must(be(("Upgrade", now.plus(3, ChronoUnit.DAYS), now.plus(4, ChronoUnit.DAYS))))
        sentDescriptions(xm).must(be(List(Set("Earlier", "Upgrade"))))

      "answer 400 for an incomplete period" in:
        val (_, session) = runIO(loginAsAdmin())
        val incomplete   = body("Upgrade", now, now.plus(1, ChronoUnit.DAYS)) - "endsAt"
        statusOf(create(incomplete, session)).must(be(Status.BAD_REQUEST))
        DB.find(classOf[MaintenancePeriod]).findCount().must(be(0))

      "not be allowed for teachers" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(create(body("Upgrade", now, now.plus(1, ChronoUnit.DAYS)), session))
          .must(be(Status.FORBIDDEN))

    "updating a period" should:
      "save it and send all periods to XM" in:
        val (_, session) = runIO(loginAsAdmin())
        val p  = period("Upgrade", now.plus(1, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS))
        val xm = FakeFacilityXm()

        val result = FakeFacilityXm.running(xm) {
          runIO(put(
            s"/app/maintenance/${p.id}",
            body("Longer upgrade", now.plus(1, ChronoUnit.DAYS), now.plus(3, ChronoUnit.DAYS)),
            session
          ))
        }
        statusOf(result).must(be(Status.OK))
        val saved = DB.find(classOf[MaintenancePeriod], p.id)
        (saved.description, saved.endsAt).must(be(("Longer upgrade", now.plus(3, ChronoUnit.DAYS))))
        sentDescriptions(xm).must(be(List(Set("Longer upgrade"))))

      "answer 400 for an incomplete period" in:
        val (_, session) = runIO(loginAsAdmin())
        val p            = period("Upgrade", now, now.plus(1, ChronoUnit.DAYS))
        statusOf(runIO(put(s"/app/maintenance/${p.id}", Json.obj("description" -> "x"), session)))
          .must(be(Status.BAD_REQUEST))

      "answer 404 for an unknown period" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(put("/app/maintenance/999", body("x", now, now), session)))
          .must(be(Status.NOT_FOUND))

    "removing a period" should:
      "delete it and send the remaining periods to XM" in:
        val (_, session) = runIO(loginAsAdmin())
        val p = period("Upgrade", now.plus(1, ChronoUnit.DAYS), now.plus(2, ChronoUnit.DAYS))
        period("Other", now.plus(3, ChronoUnit.DAYS), now.plus(4, ChronoUnit.DAYS))
        val xm = FakeFacilityXm()

        val result = FakeFacilityXm.running(xm)(runIO(delete(s"/app/maintenance/${p.id}", session)))
        statusOf(result).must(be(Status.OK))
        Option(DB.find(classOf[MaintenancePeriod], p.id)).must(be(None))
        sentDescriptions(xm).must(be(List(Set("Other"))))

      "answer 404 for an unknown period" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(runIO(delete("/app/maintenance/999", session))).must(be(Status.NOT_FOUND))
