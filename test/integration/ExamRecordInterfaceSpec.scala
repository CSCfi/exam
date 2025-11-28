// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import org.joda.time.DateTime
import play.api.http.Status
import play.api.libs.json.*
import play.api.test.Helpers.*

class ExamRecordInterfaceSpec extends BaseIntegrationSpec:

  "ExamRecordInterface" when:
    "getting records" should:
      "return empty array for current date" in:
        val filter = DateTime.now().toString("yyyy-MM-dd")
        val result = runIO(get(s"/integration/record/$filter"))

        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val records = json.as[JsArray]
        records.value must have size 0
