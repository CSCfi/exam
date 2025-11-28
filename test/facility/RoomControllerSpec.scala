// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import base.BaseIntegrationSpec
import io.ebean.DB
import models.facility.ExamRoom
import play.api.http.Status
import play.api.test.Helpers.*

class RoomControllerSpec extends BaseIntegrationSpec:

  "RoomController" when:
    "disabling a room" should:
      "set room state to INACTIVE" in:
        val (user, session) = runIO(loginAsAdmin())
        // Setup
        val room = DB.find(classOf[ExamRoom], 1L)
        room.getState must not be ExamRoom.State.INACTIVE.toString

        // Execute
        val result = runIO(delete("/app/rooms/1", session = session))
        statusOf(result).must(be(Status.OK))

        // Verify (both response and database)
        val responseJson      = contentAsJsonOf(result)
        val deserializedState = (responseJson \ "state").as[String]
        deserializedState.must(be(ExamRoom.State.INACTIVE.toString))

        val updatedRoom = DB.find(classOf[ExamRoom], 1L)
        updatedRoom.getState.must(be(ExamRoom.State.INACTIVE.toString))

    "enabling a room" should:
      "set room state to ACTIVE" in:
        val (user, session) = runIO(loginAsAdmin())
        // Setup
        val room = DB.find(classOf[ExamRoom], 1L)
        room.setState(ExamRoom.State.INACTIVE.toString)
        room.update()

        // Execute
        val result = runIO(post("/app/rooms/1", session = session))
        statusOf(result).must(be(Status.OK))

        // Verify (both response and database)
        val responseJson      = contentAsJsonOf(result)
        val deserializedState = (responseJson \ "state").as[String]
        deserializedState must be(ExamRoom.State.ACTIVE.toString)

        val updatedRoom = DB.find(classOf[ExamRoom], 1L)
        updatedRoom.getState must be(ExamRoom.State.ACTIVE.toString)
