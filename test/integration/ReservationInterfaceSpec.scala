// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import io.ebean.DB
import models.calendar.ExceptionWorkingHours
import models.facility.ExamRoom
import org.joda.time.DateTime
import play.api.http.Status
import play.api.libs.json.*
import play.api.test.Helpers.*

class ReservationInterfaceSpec extends BaseIntegrationSpec:

  "ReservationInterface" when:
    "getting reservations" should:
      "return reservations for existing room and empty array for non-existing room" in:
        val filter = DateTime.now().withYear(1999).toString("yyyy-MM-dd")

        // Test existing room
        val result1 = runIO(get(s"/integration/reservations?start=$filter&roomId=1"))
        statusOf(result1).must(be(Status.OK))
        val json1 = contentAsJsonOf(result1)
        json1.mustBe(a[JsArray])
        val records1 = json1.as[JsArray]
        records1.value must have size 2

        // Test non-existing room
        val result2 = runIO(get(s"/integration/reservations?start=$filter&roomId=10"))
        statusOf(result2).must(be(Status.OK))
        val json2 = contentAsJsonOf(result2)
        json2.mustBe(a[JsArray])
        val records2 = json2.as[JsArray]
        records2.value must be(empty)

    "getting rooms" should:
      "return list of available rooms" in:
        val result = runIO(get("/integration/rooms"))
        statusOf(result).must(be(Status.OK))
        val json = contentAsJsonOf(result)
        json.mustBe(a[JsArray])
        val records = json.as[JsArray]
        records.value must have size 1

    "getting room opening hours" should:
      "return room with filtered exception events" in:
        // Setup
        ensureTestDataLoaded()
        val room = Option(DB.find(classOf[ExamRoom], 1L)) match
          case Some(r) => r
          case None    => fail("Test room not found")

        val ewh = new ExceptionWorkingHours()
        ewh.setStartDate(DateTime.now().withDayOfMonth(15).toDate)
        ewh.setEndDate(DateTime.now().plusMonths(1).withDayOfMonth(15).toDate)
        ewh.setStartDateTimezoneOffset(0)
        ewh.setEndDateTimezoneOffset(0)

        val ewh2 = new ExceptionWorkingHours()
        ewh2.setStartDate(DateTime.now().plusMonths(1).withDayOfMonth(1).toDate)
        ewh2.setEndDate(DateTime.now().plusMonths(1).withDayOfMonth(15).toDate)
        ewh2.setStartDateTimezoneOffset(0)
        ewh2.setEndDateTimezoneOffset(0)

        room.getCalendarExceptionEvents.add(ewh)
        room.getCalendarExceptionEvents.add(ewh2)
        room.update()

        // Execute
        val filter = DateTime.now().toString("yyyy-MM-dd")
        val result = runIO(get(s"/integration/rooms/1/openinghours?date=$filter"))
        statusOf(result).must(be(Status.OK))

        // Verify
        val json                    = contentAsJsonOf(result)
        val calendarExceptionEvents = (json \ "calendarExceptionEvents").as[JsArray]
        calendarExceptionEvents.value must have size 1
