// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import models.facility.Software
import play.api.http.Status
import play.api.libs.json.JsObject
import play.api.mvc.Session

class ExamMachineControllerSpec extends BaseIntegrationSpec:

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
