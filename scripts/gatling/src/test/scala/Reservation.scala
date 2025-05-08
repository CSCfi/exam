// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import com.typesafe.config.ConfigFactory
import io.gatling.core.Predef.*
import io.gatling.http.Predef.*
import io.gatling.jdbc.Predef.*

class Reservation extends Simulation {

  private val config = ConfigFactory.load()
  private val baseUrl = config.getString("gatling.baseUrl")
  private val userCount: Integer = Integer.getInteger("users", 1)

  private val httpProtocol = http
    .baseUrl(baseUrl)
    .inferHtmlResources()
    .acceptHeader(
      "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
    )
    .acceptEncodingHeader("gzip, deflate")
    .acceptLanguageHeader("en-US,en;q=0.9")
    .userAgentHeader(
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36"
    )

  private val headers_1 = Map(
    "Accept" -> "application/json, text/plain, */*",
    "Cache-Control" -> "no-cache;no-store",
    "Csrf-Token" -> "nocheck",
    "Expires" -> "0",
    "Pragma" -> "no-cache",
    "Sec-Fetch-Dest" -> "empty",
    "Sec-Fetch-Mode" -> "cors",
    "Sec-Fetch-Site" -> "same-origin",
    "sec-ch-ua" -> """Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110""",
    "sec-ch-ua-mobile" -> "?0",
    "sec-ch-ua-platform" -> "macOS"
  )

  private val headers_2 = Map(
    "Accept" -> "application/json, text/plain, */*",
    "Cache-Control" -> "no-cache;no-store",
    "Content-Type" -> "application/json",
    "Csrf-Token" -> "nocheck",
    "Expires" -> "0",
    "Origin" -> baseUrl,
    "Pragma" -> "no-cache",
    "Sec-Fetch-Dest" -> "empty",
    "Sec-Fetch-Mode" -> "cors",
    "Sec-Fetch-Site" -> "same-origin",
    "sec-ch-ua" -> """Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110""",
    "sec-ch-ua-mobile" -> "?0",
    "sec-ch-ua-platform" -> "macOS"
  )

  private val headers_3 = Map(
    "Accept" -> "application/json, text/plain, */*",
    "Cache-Control" -> "no-cache;no-store",
    "Csrf-Token" -> "nocheck",
    "Expires" -> "0",
    "Origin" -> baseUrl,
    "Pragma" -> "no-cache",
    "Sec-Fetch-Dest" -> "empty",
    "Sec-Fetch-Mode" -> "cors",
    "Sec-Fetch-Site" -> "same-origin",
    "sec-ch-ua" -> """Chromium";v="110", "Not A(Brand";v="24", "Google Chrome";v="110""",
    "sec-ch-ua-mobile" -> "?0",
    "sec-ch-ua-platform" -> "macOS"
  )

  private val users = jdbcFeeder(
    config.getString("gatling.db.connection"),
    config.getString("gatling.db.username"),
    config.getString("gatling.db.password"),
    "select split_part(eppn, '@', 1) as username from app_user where email like '%testi%' order by username"
  )

  private val today = java.time.LocalDate.now.toString
  private val roomId = 1 // same as with the machines we create in sql

  private val scn = scenario("reservation")
    .feed(users)
    .exec(session => session.set("today", today).set("roomId", roomId))
    .exec(
      http("login")
        .post("/app/session")
        .headers(headers_2)
        .body(StringBody("""{"username": "#{username}","password": "test"}"""))
        .asJson
    )
    .pause(1)
    .exec(
      http("search exams")
        .get(s"/app/student/exams?filter=${config.getString("gatling.examName")}")
        .headers(headers_1)
        .check(status.is(200))
        .check(jsonPath("$[0].id").exists.saveAs("examId"))
        .check(jsonPath("$[0].course.code").exists.saveAs("courseCode"))
    )
    .pause(1)
    .exec(
      http("get enrolment information")
        .get("/app/enrolments/exam/#{examId}")
        .headers(headers_1)
        .resources(
          http("make enrolment")
            .post("/app/enrolments/#{examId}")
            .headers(headers_2)
            .body(StringBody("""{"code": "#{courseCode}"}"""))
        )
    )
    .pause(1)
    .exec(
      http("get slots")
        .get("/app/calendar/#{examId}/#{roomId}?day=#{today}")
        .headers(headers_1)
        .check(jsonPath("$[0].start").exists.saveAs("starts"))
        .check(jsonPath("$[0].end").exists.saveAs("ends"))
    )
    .pause(1)
    .exec(
      http("make reservation")
        .post("/app/calendar/reservation")
        .headers(headers_2)
        .body(
          StringBody(
            """{"start": "#{starts}", "end": "#{ends}", "examId": #{examId}, "roomId": #{roomId}, "orgId": null, "sectionIds": [], "aids": []}"""
          )
        )
        .asJson
    )
    .pause(1)
    .exec(
      http("logout")
        .delete("/app/session")
        .headers(headers_3)
    )

  setUp(scn.inject(rampUsers(userCount).during(100))).protocols(httpProtocol)
}
