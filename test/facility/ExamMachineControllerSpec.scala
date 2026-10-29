// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import models.facility.Software
import play.api.http.Status
import play.api.libs.json.JsObject

class ExamMachineControllerSpec extends BaseIntegrationSpec:

  private def createSoftware(name: String, status: Option[String]): Unit =
    val software = new Software
    software.name = name
    software.status = status.orNull
    software.save()

  "ExamMachineController" when:
    "listing software" should:
      "leave out software disabled before removal became a delete" in:
        val (_, session) = runIO(loginAsAdmin())
        createSoftware("Probe active", Some("ACTIVE"))
        createSoftware("Probe disabled", Some("DISABLED"))
        createSoftware("Probe new", None)

        val result = runIO(get("/app/softwares", session = session))
        statusOf(result).must(be(Status.OK))

        val names = contentAsJsonOf(result).as[Seq[JsObject]].map(s => (s \ "name").as[String])
        names.filter(_.startsWith("Probe")).toSet.must(be(Set("Probe active", "Probe new")))
