// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import org.eclipse.jetty.server.Server
import org.scalatest.BeforeAndAfterAll
import org.scalatest.matchers.must.Matchers
import play.api.Application
import play.api.inject.guice.GuiceApplicationBuilder
import play.api.libs.json.Json
import play.api.libs.ws.{WSClient, writeableOf_JsValue, writeableOf_String}
import services.iop.{IopAwareWSClient, IopProtocol}

import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.Await
import scala.concurrent.duration.*

class IopProtocolHeadersSpec extends BaseIntegrationSpec with BeforeAndAfterAll with Matchers:

  private val Port   = 31249
  private val XmHost = s"http://localhost:$Port"

  // Last request headers seen by the stub, keyed by lower-case header name, and its body
  private val received               = new ConcurrentHashMap[String, String]()
  @volatile private var receivedBody = ""

  private class RecordingServlet extends HttpServlet:
    private def record(request: HttpServletRequest, response: HttpServletResponse): Unit =
      received.clear()
      request.getHeaderNames.asIterator.forEachRemaining { name =>
        received.put(name.toLowerCase, request.getHeader(name))
      }
      receivedBody = new String(request.getInputStream.readAllBytes(), "UTF-8")
      response.setStatus(HttpServletResponse.SC_OK)
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      record(request, response)
    override def doPost(request: HttpServletRequest, response: HttpServletResponse): Unit =
      record(request, response)

  private var server: Option[Server] = None

  override def fakeApplication(): Application =
    new GuiceApplicationBuilder()
      .configure("exam.integration.iop.host" -> XmHost)
      .build()

  override def beforeAll(): Unit =
    super.beforeAll()
    server = Some(
      RemoteServerHelper.createServer(
        Port,
        false,
        ServletDef.FromInstance(new RecordingServlet()) -> List("/*")
      )
    )

  override def afterAll(): Unit =
    try server.foreach(RemoteServerHelper.shutdownServer)
    finally super.afterAll()

  private def call(url: String): Unit =
    Await.result(app.injector.instanceOf[WSClient].url(url).get(), 10.seconds)

  private def header(name: String): Option[String] = Option(received.get(name.toLowerCase))

  "WSClient" should:
    "identify this installation on requests to XM" in:
      call(s"$XmHost/api/organisations")
      header(IopProtocol.ProtocolHeader) mustBe Some(IopProtocol.Version.toString)
      header(IopProtocol.ExamVersionHeader) mustBe
        Some(app.configuration.get[String]("exam.release.version"))
      header(IopProtocol.OrganisationHeader) mustBe Some("test-org")

    "give each request to XM its own request id" in:
      call(s"$XmHost/api/organisations")
      val first = header(IopProtocol.RequestIdHeader)
      first.exists(IopProtocol.isRequestId) mustBe true
      call(s"$XmHost/api/organisations")
      header(IopProtocol.RequestIdHeader) must not be first

    "leave requests to other hosts untouched" in:
      // Same server, but addressed by a host name that is not the configured XM host
      call(s"http://127.0.0.1:$Port/api/organisations")
      header(IopProtocol.ProtocolHeader) mustBe None
      header(IopProtocol.OrganisationHeader) mustBe None
      header(IopProtocol.RequestIdHeader) mustBe None

  "Request bodies to XM" should:
    val body =
      Json.obj("start" -> "2026-01-15T09:00:00Z", "created" -> "2026-01-15T09:00:00.123456Z")

    "carry timestamps with exactly milliseconds" in:
      Await.result(
        app.injector.instanceOf[WSClient].url(s"$XmHost/api/exams").post(body),
        10.seconds
      )
      val sent = Json.parse(receivedBody)
      (sent \ "start").as[String] mustBe "2026-01-15T09:00:00.000Z"
      (sent \ "created").as[String] mustBe "2026-01-15T09:00:00.123Z"
      header("Content-Type").exists(_.startsWith("application/json")) mustBe true

    "keep the content type of a JSON string body" in:
      Await.result(
        app.injector
          .instanceOf[WSClient]
          .url(s"$XmHost/api/enrolments/x/assessment")
          .addHttpHeaders("Content-Type" -> "application/json")
          .post(body.toString),
        10.seconds
      )
      (Json.parse(receivedBody) \ "start").as[String] mustBe "2026-01-15T09:00:00.000Z"
      header("Content-Type") mustBe Some("application/json")

    "be left alone for other hosts" in:
      Await.result(
        app.injector.instanceOf[WSClient].url(s"http://127.0.0.1:$Port/api/exams").post(body),
        10.seconds
      )
      (Json.parse(receivedBody) \ "start").as[String] mustBe "2026-01-15T09:00:00Z"

  "IOP endpoints" should:
    "tell XM which protocol version answered" in:
      val result = runIO(get("/integration/iop/slots"))
      headerOf(result, IopProtocol.ProtocolHeader) mustBe Some(IopProtocol.Version.toString)
      headerOf(result, IopProtocol.ExamVersionHeader) must be(defined)

    "echo the request id XM sent" in:
      val result = runIO(
        makeRequest(
          "GET",
          "/integration/iop/slots",
          headers = Map(IopProtocol.RequestIdHeader -> "3f9a1c2e")
        )
      )
      headerOf(result, IopProtocol.RequestIdHeader) mustBe Some("3f9a1c2e")

    "ignore a malformed request id" in:
      val result = runIO(
        makeRequest(
          "GET",
          "/integration/iop/slots",
          headers = Map(IopProtocol.RequestIdHeader -> "not-an-id")
        )
      )
      headerOf(result, IopProtocol.RequestIdHeader) mustBe None

    "not add protocol headers to other responses" in:
      val result = runIO(get("/app/session"))
      headerOf(result, IopProtocol.ProtocolHeader) mustBe None

  "addressesXm" should:
    "match the XM host and paths under it only" in:
      IopAwareWSClient.addressesXm("http://xm:3000", "http://xm:3000/api/exams") mustBe true
      IopAwareWSClient.addressesXm("http://xm:3000/", "http://xm:3000/api/exams") mustBe true
      IopAwareWSClient.addressesXm("http://xm:3000", "http://xm:3000?x=1") mustBe true
      IopAwareWSClient.addressesXm("http://xm:3000", "http://xm:30001/api") mustBe false
      IopAwareWSClient.addressesXm("http://xm:3000", "http://other/api") mustBe false
      IopAwareWSClient.addressesXm("", "http://xm:3000/api") mustBe false
