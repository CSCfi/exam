// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import com.typesafe.config.ConfigFactory
import io.gatling.core.Predef.*
import io.gatling.core.session.*
import io.gatling.core.structure.ScenarioBuilder
import io.gatling.http.Predef.*
import io.gatling.http.protocol.HttpProtocolBuilder
import io.gatling.jdbc.Predef.*

import java.sql.DriverManager
import java.time.{Duration, Instant, OffsetDateTime, ZoneId}
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit

import scala.util.Using

class Examination extends Simulation {

  private val config = ConfigFactory.load()
  private val baseUrl = config.getString("gatling.baseUrl")
  private val userCount: Integer = Integer.getInteger("users", 1)

  val httpProtocol: HttpProtocolBuilder = http
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

  val headers_1: Map[String, String] = Map(
    "Accept" -> "application/json, text/plain, */*",
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

  val headers_2: Map[String, String] = Map(
    "Accept" -> "application/json, text/plain, */*",
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

  val headers_3: Map[String, String] = Map(
    "Accept" -> "application/json, text/plain, */*",
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
    "select split_part(eppn, '@', 1) as username, id as userid from app_user where email like '%testi%' order by username"
  )

  private def isDst = ZoneId.of("Europe/Helsinki").getRules.isDaylightSavings(Instant.now())

  private def secondsToStart(input: String) =
    val start = OffsetDateTime.parse(input, DateTimeFormatter.ISO_OFFSET_DATE_TIME)
    val startDst = if isDst then start.plus(-1, ChronoUnit.HOURS) else start
    val now = Instant.now().truncatedTo(ChronoUnit.MILLIS)
    Math.max(Duration.between(now, startDst).getSeconds.toInt, 0) + 2 // some time buffer

  private def delayToMillis(input: String) =
    val unit = if config.getBoolean("gatling.delayUsesMilliseconds") then ChronoUnit.MILLIS else ChronoUnit.SECONDS
    Duration.of(input.toLong, unit)

  private def adjustReservations() =
    def update(sql: String) =
      val (url, driver) =
        (config.getString("gatling.db.connection"), "org.postgresql.Driver")
      val (username, password) = (config.getString("gatling.db.username"), config.getString("gatling.db.password"))
      Class.forName(driver)
      Using(DriverManager.getConnection(url, username, password))(conn =>
        conn.createStatement.executeQuery(sql)
      )

    val extra = if isDst then " + '1 hour'::interval" else ""
    update(s"""update reservation set
      start_at = 'now'::timestamp + '5 min'::interval$extra,
      end_at = 'now'::timestamp + '5 min'::interval$extra + '45 min'::interval
      where id IN
      (SELECT id FROM reservation where end_at > 'now'::timestamp)""")

  val scn: ScenarioBuilder = scenario("examination")
    .feed(users)
    .exec(
      http("login")
        .post("/app/session")
        .headers(headers_2)
        .body(StringBody("""{"username":"#{username}","password":"test"}"""))
        .asJson
        .check(header(StaticValueExpression("x-exam-upcoming-exam")).exists.saveAs("upcomingExam"))
    )
    .exec { session =>
      session
        .set(
          "enrolmentId",
          session("upcomingExam").as[String].split(":::").last
        )
        .set(
          "teacherExamHash",
          session("upcomingExam").as[String].split(":::").head
        )
    }
    .pause(1)
    .exec(
      http("get enrolment info")
        .get(
          "/app/student/enrolments/#{enrolmentId}"
        )
        .check(jsonPath("$.reservation.startAt").exists.saveAs("starts"))
        .check(jsonPath("$.delay").exists.saveAs("rawDelay"))
        .resources(
          http("initialize exam")
            .post("/app/student/exam/#{teacherExamHash}")
            .headers(headers_2)
        )
    )
    .exec(session => session.set("delay", secondsToStart(session("starts").as[String])))
    .exec(session => session.set("extraDelay", delayToMillis(session("rawDelay").as[String])))
    .exec(session => {
      println(s"${session("username").as[String]}: exam starts at: ${session("starts")
          .as[String]}. Waiting for ${session("delay").as[Int]} seconds plus extra delay of ${session("extraDelay").as[Duration].toMillis}ms")
      session
    })
    .pause("#{delay}") // standard delay for actual examination start
    .pause("#{extraDelay}") // additional delay for distributing start times for optimization
    .exec(
      http("check session")
        .get("/app/session")
        .headers(headers_1)
        .check(header(StaticValueExpression("x-exam-start-exam")).exists.saveAs("studentExamHash"))
    )
    .pause(1)
    .exec(
      http("start exam")
        .get("/app/student/exam/#{studentExamHash}")
        .headers(headers_1)
        .check(status.is(200))
        .headers(headers_1)
    )
    .pause(1)
    .exec(
      http("get remaining time")
        .get("/app/time/#{studentExamHash}")
        .headers(headers_1),
    )
    .pause(1)
    .exec(
      http("get room info")
        .get("/app/enrolments/room/#{studentExamHash}")
        .headers(headers_1)
    )
    .pause(10, 100)
    .exec(
      http("turn exam")
        .put("/app/student/exam/#{studentExamHash}")
        .headers(headers_2)
    )
    .pause(8)
    .exec(
      http("logout")
        .delete("/app/session")
        .headers(headers_3)
    )

  adjustReservations()
  setUp(scn.inject(rampUsers(userCount).during(config.getInt("gatling.rampDuration")))).protocols(httpProtocol)
}
