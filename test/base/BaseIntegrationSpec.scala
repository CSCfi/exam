// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package base

import io.ebean.DB
import models.exam.Exam
import models.user.User
import org.apache.pekko.stream.Materializer
import org.apache.pekko.util.Timeout
import org.scalatest.BeforeAndAfterEach
import org.scalatest.concurrent.ScalaFutures
import org.scalatestplus.play.PlaySpec
import org.scalatestplus.play.guice.*
import org.yaml.snakeyaml.representer.Representer
import org.yaml.snakeyaml.{DumperOptions, LoaderOptions, Yaml}
import play.api.Application
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.*
import play.api.test.*
import play.api.test.Helpers.*

import java.io.FileInputStream
import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import scala.concurrent.duration.*
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** Base specification class for integration tests using ScalaTest + Play.
  */
abstract class BaseIntegrationSpec extends PlaySpec with GuiceOneAppPerTest with ScalaFutures with BeforeAndAfterEach:

  implicit lazy val executionContext: ExecutionContext = app.actorSystem.dispatcher
  // Implicit values needed for Play test helpers
  implicit lazy val materializer: Materializer = app.materializer
  implicit val timeout: Timeout                = Timeout(5.seconds)

  // IDEA seems to need this
  System.setProperty("config.resource", "integrationtest.conf")

  // Common test headers (equivalent to HAKA_HEADERS in Java)
  protected val hakaHeaders: Map[String, String] = Map(
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

  // Flag to track if test data has been loaded for this test instance
  private var testDataLoaded = false

  // Test data setup - equivalent to Java @Before setUp()
  override def beforeEach(): Unit =
    super.beforeEach()
    testDataLoaded = false

  /** Ensure test data is loaded before running tests. Call this method explicitly in tests that need to access the
    * database directly before making any HTTP requests (which would trigger automatic loading).
    */
  protected def ensureTestDataLoaded(): Unit =
    if !testDataLoaded then
      addTestData()
      testDataLoaded = true

  /** Load test data from a YAML file. */
  private def addTestData(): Unit =
    val loaderOptions = new LoaderOptions()
    loaderOptions.setMaxAliasesForCollections(400)
    loaderOptions.setTagInspector(_ => true)

    val dumperOptions = new DumperOptions()
    val yaml = new Yaml(
      new JodaPropertyConstructor(loaderOptions),
      new Representer(dumperOptions),
      dumperOptions,
      loaderOptions
    )

    val result = Using(new FileInputStream("test/resources/initial-data.yml")): is =>
      val all = yaml.load(is).asInstanceOf[java.util.Map[String, java.util.List[Object]]]

      // Load entities in dependency order (same as Java)
      val entityTypes = List(
        "role",
        "exam-type",
        "exam-execution-type",
        "languages",
        "organisations",
        "attachments",
        "users",
        "grade-scales",
        "grades",
        "question-essay",
        "question-multiple-choice",
        "question-weighted-multiple-choice",
        "question-claim-choice",
        "question-clozetest",
        "softwares",
        "courses",
        "comments"
      )
      val examDependentTypes = List(
        "exam-sections",
        "section-questions",
        "exam-participations",
        "exam-inspections",
        "mail-addresses",
        "calendar-events",
        "exam-rooms",
        "exam-machines",
        "exam-room-reservations",
        "exam-enrolments"
      )

      // Save all standard entities
      for entityType <- entityTypes yield Option(all.get(entityType)).map(DB.saveAll)
      // Special handling for exams (need hash generation)
      val exams = Option(all.get("exams")).map(_.asScala.toList.map(_.asInstanceOf[Exam])).getOrElse(List.empty)
      exams.foreach { exam =>
        exam.generateHash()
        exam.save()
      }
      // Save remaining entities that depend on exams
      for entityType <- examDependentTypes yield Option(all.get(entityType)).map(DB.saveAll)

    result
      .recover:
        case e: Exception => throw new RuntimeException("Failed to load test data", e)
      .get

  /** Make a request with optional headers and session.
    */
  protected def makeRequest(
      method: String,
      path: String,
      body: Option[JsValue] = None,
      headers: Map[String, String] = hakaHeaders,
      followRedirects: Boolean = false,
      session: Session = Session()
  )(implicit app: Application): Future[Result] =
    ensureTestDataLoaded()

    // Create base request with headers and session
    val baseRequest = FakeRequest(method, path)
      .withHeaders(headers.toSeq*)
      .withSession(session.data.toSeq*)

    // Route the request with or without JSON body
    val result =
      if body.isDefined && method != GET then
        route(app, baseRequest.withJsonBody(body.get)).getOrElse(
          throw new RuntimeException(s"No route found for $method $path")
        )
      else
        route(app, baseRequest).getOrElse(
          throw new RuntimeException(s"No route found for $method $path")
        )

    if followRedirects then
      // Handle redirects (simplified - you might want to make this more robust)
      result.flatMap: res =>
        res.header.headers.get("Location") match
          case Some(location) => makeRequest(method, location, body, headers)
          case None           => Future.successful(res)
    else result

  /** Convenience methods for making requests.
    */
  protected def get(path: String, followRedirects: Boolean = false, session: Session = Session()): Future[Result] =
    makeRequest(GET, path, followRedirects = followRedirects, session = session)
  protected def post(path: String, session: Session = Session()): Future[Result] =
    makeRequest(POST, path, session = session)
  protected def delete(path: String, session: Session = Session()): Future[Result] =
    makeRequest(DELETE, path, session = session)
  protected def put(path: String, body: JsValue, session: Session = Session()): Future[Result] =
    makeRequest("PUT", path, Some(body), session = session)
  protected def post(path: String, body: JsValue, followRedirects: Boolean): Future[Result] =
    makeRequest(POST, path, Some(body), followRedirects = followRedirects)

  /** Login with EPPN and return Future of (User, Session).
    */
  protected def login(eppn: String, additionalHeaders: Map[String, String] = Map.empty): Future[(User, Session)] =
    // Extract username from eppn for consistent user creation
    val username = eppn.split("@").head
    val domain   = eppn.split("@").last

    val loginHeaders = hakaHeaders ++ additionalHeaders ++ Map(
      "eppn"        -> eppn,
      "mail"        -> java.net.URLEncoder.encode(eppn, "UTF-8"),
      "displayName" -> java.net.URLEncoder.encode(s"Test $username", "UTF-8"),
      "sn"          -> java.net.URLEncoder.encode(username.capitalize, "UTF-8")
    )
    val result = makeRequest(POST, "/app/session", headers = loginHeaders)

    result.map { res =>
      status(Future.successful(res)) must be(Status.OK)
      val sessionData  = session(Future.successful(res))
      val responseJson = contentAsJson(Future.successful(res))
      val userId       = (responseJson \ "id").as[Long]
      val user         = DB.find(classOf[User], userId)
      (user, sessionData)
    }

  /** Login expecting failure (equivalent to Java loginExpectFailure method).
    */
  protected def loginExpectFailure(eppn: String): Future[Result] =
    // Extract username from eppn for consistent user creation attempt
    val username = eppn.split("@").head

    val loginHeaders = hakaHeaders ++ Map(
      "eppn"        -> eppn,
      "mail"        -> java.net.URLEncoder.encode(eppn, "UTF-8"),
      "displayName" -> java.net.URLEncoder.encode(s"Test $username", "UTF-8"),
      "sn"          -> java.net.URLEncoder.encode(username.capitalize, "UTF-8")
    )
    val result = makeRequest(POST, "/app/session", headers = loginHeaders)

    result.map { res =>
      status(Future.successful(res)) must be(Status.BAD_REQUEST)
      res
    }

  protected def logout(): Future[Result]                  = makeRequest(DELETE, "/app/session")
  protected def loginAsAdmin(): Future[(User, Session)]   = login("admin@funet.fi")
  protected def loginAsTeacher(): Future[(User, Session)] = login("teacher@funet.fi")
  protected def loginAsStudent(): Future[(User, Session)] = login("student@funet.fi")

  /** Debug helper to convert any Future to synchronous result for easier debugging.
    * Use this when you need to set breakpoints in test code.
    * 
    * Example:
    *   val (user, session) = debug(loginAsTeacher())
    *   val result = debug(makeRequest(GET, "/some/path"))
    */
  protected def debug[T](future: Future[T]): T = Await.result(future, 10.seconds)

  /** Helper to parse JSON response.
    */
  protected def parseJsonResponse(result: Future[Result]): JsValue =
    contentAsJson(result)

  /** Helper to extract specific field from JSON response.
    */
  protected def extractField[T](result: Future[Result], field: String)(implicit reads: Reads[T]): T =
    val json = contentAsJson(result)
    (json \ field).as[T]

  /** Assert that a result has the expected status.
    */
  protected def assertStatus(result: Future[Result], expectedStatus: Int): Unit =
    status(result) must be(expectedStatus)

  /** Assert that a result is OK (200).
    */
  protected def assertOk(result: Future[Result]): Unit =
    assertStatus(result, Status.OK)

  /** Assert that a result is Bad Request (400).
    */
  protected def assertBadRequest(result: Future[Result]): Unit =
    assertStatus(result, Status.BAD_REQUEST)

  /** Helper to check if result redirects to a specific location.
    */
  protected def assertRedirectsTo(result: Future[Result], expectedLocation: String): Unit =
    status(result) must be(Status.SEE_OTHER)
    redirectLocation(result) must be(Some(expectedLocation))

  /** Helper to assert JSON field value.
    */
  protected def assertJsonField[T](result: Future[Result], field: String, expectedValue: T)(implicit
      reads: Reads[T]
  ): Unit =
    val json = contentAsJson(result)
    (json \ field).as[T] must be(expectedValue)

  /** Helper to assert that JSON contains a specific field.
    */
  protected def assertJsonHasField(result: Future[Result], field: String): Unit =
    val json = contentAsJson(result)
    (json \ field).isDefined must be(true)

  /** Helper to get content type from result.
    */
  protected def getContentType(result: Future[Result]): Option[String] =
    contentType(result)

  /** Helper to assert content type.
    */
  protected def assertContentType(result: Future[Result], expectedType: String): Unit =
    contentType(result) must be(Some(expectedType))

  /** Helper for async operations with proper error handling.
    */
  protected def withAsyncResult[T](result: Future[Result])(action: Result => T): T =
    whenReady(result)(action)

  /** Helper to chain multiple async operations.
    */
  protected def chainRequests(operations: (() => Future[Result])*): Future[List[Result]] =
    operations.foldLeft(Future.successful(List.empty[Result])): (acc, op) =>
      for
        results   <- acc
        newResult <- op()
      yield results :+ newResult
