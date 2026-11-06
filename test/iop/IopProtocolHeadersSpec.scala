// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
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
import play.api.libs.ws.WSClient
import services.iop.{IopAwareWSClient, IopProtocol}

import java.util.concurrent.ConcurrentHashMap
import scala.concurrent.Await
import scala.concurrent.duration.*

class IopProtocolHeadersSpec extends BaseIntegrationSpec with BeforeAndAfterAll with Matchers:

  private val Port   = 31249
  private val XmHost = s"http://localhost:$Port"

  // Last request headers seen by the stub, keyed by lower-case header name
  private val received = new ConcurrentHashMap[String, String]()

  private class RecordingServlet extends HttpServlet:
    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      received.clear()
      request.getHeaderNames.asIterator.forEachRemaining { name =>
        received.put(name.toLowerCase, request.getHeader(name))
      }
      response.setStatus(HttpServletResponse.SC_OK)

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

    "leave requests to other hosts untouched" in:
      // Same server, but addressed by a host name that is not the configured XM host
      call(s"http://127.0.0.1:$Port/api/organisations")
      header(IopProtocol.ProtocolHeader) mustBe None
      header(IopProtocol.OrganisationHeader) mustBe None

  "IOP endpoints" should:
    "tell XM which protocol version answered" in:
      val result = runIO(get("/integration/iop/slots"))
      headerOf(result, IopProtocol.ProtocolHeader) mustBe Some(IopProtocol.Version.toString)
      headerOf(result, IopProtocol.ExamVersionHeader) must be(defined)

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
