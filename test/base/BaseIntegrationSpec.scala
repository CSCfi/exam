// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import cats.effect.IO
import io.ebean.DB
import models.user.User
import org.apache.pekko.stream.Materializer
import org.apache.pekko.util.Timeout
import org.scalatest.BeforeAndAfterEach
import org.scalatest.concurrent.ScalaFutures
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.play.guice._
import play.api.Application
import play.api.http.{Status, Writeable}
import play.api.libs.json._
import play.api.mvc._
import play.api.test.Helpers._
import play.api.test._

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import scala.concurrent.duration._
import scala.concurrent.{ExecutionContext, Future}

/** Base specification class for integration tests using ScalaTest + Play.
  */
abstract class BaseIntegrationSpec extends PlaySpec with GuiceOneAppPerTest with ScalaFutures
    with BeforeAndAfterEach:

  implicit lazy val executionContext: ExecutionContext      = app.actorSystem.dispatcher
  implicit lazy val ioRuntime: cats.effect.unsafe.IORuntime = cats.effect.unsafe.implicits.global
  // Implicit values needed for Play test helpers
  implicit lazy val materializer: Materializer = app.materializer
  implicit val timeout: Timeout                = Timeout(5.seconds)

  // IDEA seems to need this
  System.setProperty("config.resource", "integrationtest.conf")

  // Flag to track if test data has been loaded for this test instance (a bit hacky yes)
  private var testDataLoaded = false
  private val hakaHeaders: Map[String, String] = Map(
    "Accept"               -> "application/json, text/plain, */*",
    "Content-Type"         -> "application/json;charset=UTF-8",
    "Csrf-Token"           -> "nocheck", // Bypass CSRF protection in tests
    "displayName"          -> "George%20Lazenby",
    "sn"                   -> "Lazenby",
    "preferredLanguage"    -> "de",      // use an unsupported UI language
    "Shib-Session-ID"      -> "_5d9a583a894275c15edef02c5602c4d7",
    "mail"                 -> "glazenby%40funet.fi",
    "unscoped-affiliation" -> "member;employee;faculty",
    "employeeNumber"       -> "12345",
    "schacPersonalUniqueCode" -> ("urn:schac:personalUniqueCode:int:peppiID:org3.org:33333;" +
      "urn:schac:personalUniqueCode:int:sisuID:org2.org:22222;" +
      "urn:schac:personalUniqueCode:int:oodiID:org1.org:11111"),
    "homeOrganisation" -> "oulu.fi",
    "Csrf-Token"       -> "nocheck",
    "logouturl" ->
      URLEncoder.encode(
        "https://logout.foo.bar.com?returnUrl=" +
          URLEncoder.encode("https://foo.bar.com", StandardCharsets.UTF_8),
        StandardCharsets.UTF_8
      )
  )

  // Test data setup - equivalent to Java @Before setUp()
  override def beforeEach(): Unit =
    super.beforeEach()
    testDataLoaded = false

  /** Ensure test data is loaded before running tests. Call this method explicitly in tests that
    * need to access the database directly before making any HTTP requests (which would trigger
    * automatic loading).
    */
  protected def ensureTestDataLoaded(): Unit =
    if !testDataLoaded then
      TestDataLoader.load()
      testDataLoaded = true

  protected def makeRequest(
      method: String,
      path: String,
      body: Option[JsValue] = None,
      headers: Map[String, String] = hakaHeaders,
      followRedirects: Boolean = false,
      session: Session = Session()
  )(implicit app: Application, ec: ExecutionContext): IO[Result] =

    def runRoute[T](req: FakeRequest[T])(implicit writeable: Writeable[T]): IO[Result] =
      IO.fromFuture(IO {
        route(app, req).getOrElse(
          throw new RuntimeException(s"No route found for $method $path")
        )
      })

    for
      // This will be debuggable
      _ <- IO.pure(ensureTestDataLoaded())

      baseRequest = FakeRequest(method, path)
        .withHeaders(headers.toSeq*)
        .withSession(session.data.toSeq*)

      result <- body match
        case Some(json) if method != GET => runRoute(baseRequest.withJsonBody(json))
        case _                           => runRoute(baseRequest)

      finalResult <-
        if !followRedirects then IO.pure(result)
        else
          result.header.headers.get("Location") match
            case Some(location) =>
              // NOTE: recursive call — but still debuggable
              makeRequest(method, location, body, headers, followRedirects = true, session)
            case None => IO.pure(result)
    yield finalResult

  protected def login(
      eppn: String,
      additionalHeaders: Map[String, String] = Map.empty
  ): IO[(User, Session)] =
    for
      headers <- IO.pure(hakaHeaders + ("eppn" -> eppn) ++ additionalHeaders)
      result  <- makeRequest(POST, "/app/session", headers = headers)
      _ <- IO {
        statusOf(result) must be(Status.OK)
      }
      sessionData  <- IO.pure(sessionOf(result))
      responseJson <- IO.pure(contentAsJsonOf(result))
      userId       <- IO.pure((responseJson \ "id").as[Long])
      user         <- IO.pure(DB.find(classOf[User], userId))
    yield (user, sessionData)

  protected def loginAsAdmin(): IO[(User, Session)]   = login("admin@funet.fi")
  protected def loginAsTeacher(): IO[(User, Session)] = login("teacher@funet.fi")
  protected def loginAsStudent(): IO[(User, Session)] = login("student@funet.fi")

  protected def loginExpectFailure(eppn: String): IO[Result] =
    for
      headers <- IO.pure(hakaHeaders + ("eppn" -> eppn))
      result  <- makeRequest(POST, "/app/session", headers = headers)
      _ <- IO {
        statusOf(result) must be(Status.BAD_REQUEST)
      }
    yield result

  protected def logout(): IO[Result] = makeRequest(DELETE, "/app/session")

  // Convenience methods for making requests
  protected def get(
      path: String,
      followRedirects: Boolean = false,
      session: Session = Session()
  ): IO[Result] =
    makeRequest(GET, path, followRedirects = followRedirects, session = session)
  protected def post(path: String, session: Session = Session()): IO[Result] =
    makeRequest(POST, path, session = session)
  protected def delete(path: String, session: Session = Session()): IO[Result] =
    makeRequest(DELETE, path, session = session)
  protected def put(path: String, body: JsValue, session: Session = Session()): IO[Result] =
    makeRequest("PUT", path, Some(body), session = session)

  // Helpers for using Play test utilities with IO-based Results.
  protected def statusOf(result: Result): Int            = status(Future.successful(result))
  protected def contentAsJsonOf(result: Result): JsValue = contentAsJson(Future.successful(result))
  protected def sessionOf(result: Result): Session       = session(Future.successful(result))
  protected def contentAsStringOf(result: Result): String =
    contentAsString(Future.successful(result))
  protected def headerOf(result: Result, name: String): Option[String] =
    result.header.headers.get(name)

  // IO runners
  protected def runIO[A](block: IO[A]): A = block.unsafeRunSync()
  protected def runIOWithTimeout[A](timeout: FiniteDuration = 30.seconds)(test: IO[A]): A =
    test.timeout(timeout).unsafeRunSync()

  /** Resource-safe test runner for tests that need cleanup. Uses Cats Effect Resource for proper
    * resource management.
    *
    * Example: Resource.make(IO(startServer()))(server => IO(server.stop())).use { server => for
    * (user, session) <- loginAsTeacher() result <- makeRequest(GET, "/some/path", session =
    * session) yield statusOf(result) must be(Status.OK) }
    */
  protected def runIOResource[A](test: cats.effect.Resource[IO, A]): A =
    test.use(IO.pure).unsafeRunSync()
