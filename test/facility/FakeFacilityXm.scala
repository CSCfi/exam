// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package facility

import helpers.RemoteServerHelper
import helpers.RemoteServerHelper.ServletDef
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}

import java.util.concurrent.ConcurrentLinkedQueue
import scala.jdk.CollectionConverters.*

/** XM's organisation API (port 31247 in integrationtest.conf). Records each request and answers
  * with `status` and `body`.
  */
class FakeFacilityXm(status: Int = 200, body: String = "{}") extends HttpServlet:
  case class Request(method: String, path: String, body: String)

  private val received = new ConcurrentLinkedQueue[Request]()

  def requests: List[Request] = received.asScala.toList

  override def service(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    received.add(Request(
      req.getMethod,
      req.getRequestURI,
      new String(req.getInputStream.readAllBytes())
    ))
    resp.setStatus(status)
    resp.setContentType("application/json")
    resp.getWriter.write(body)

object FakeFacilityXm:
  def running[A](xm: FakeFacilityXm)(test: => A): A =
    val server = RemoteServerHelper.createServer(
      31247,
      false,
      ServletDef.FromInstance(xm) -> List("/api/organisations/*")
    )
    try test
    finally RemoteServerHelper.shutdownServer(server)
