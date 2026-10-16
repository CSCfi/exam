// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import play.api.http.Status
import play.api.libs.json.*

import java.time.LocalDate

class ExamRecordInterfaceSpec extends BaseIntegrationSpec:

  "ExamRecordInterface" when:
    "getting records" should:
      "return empty array for current date" in:
        val filter = LocalDate.now().toString
        val result = runIO(get(s"/integration/record/$filter"))

        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val records = json.as[JsArray]
        records.value must have size 0
