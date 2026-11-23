// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import play.api.libs.json.Json

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger

/** XM's attachment store (`/api/attachments`), keeping uploaded files in memory. */
class FakeXmAttachments extends HttpServlet:
  case class File(name: String, mimeType: String, content: Array[Byte])

  private val files    = new ConcurrentHashMap[String, File]()
  private val sequence = new AtomicInteger()

  /** When set, requests of this method are answered with this status. */
  @volatile var failWith: Option[(String, Int)] = None

  def reset(): Unit =
    files.clear()
    failWith = None

  def add(id: String, name: String, content: String): Unit =
    files.put(id, File(name, "text/plain", content.getBytes))

  def get(id: String): Option[File] = Option(files.get(id))

  def ids: Set[String] =
    import scala.jdk.CollectionConverters.*
    files.keySet.asScala.toSet

  private def segments(req: HttpServletRequest): List[String] =
    Option(req.getPathInfo).toList.flatMap(_.split('/').filter(_.nonEmpty))

  private def describe(id: String, resp: HttpServletResponse, status: Int): Unit =
    val f = files.get(id)
    resp.setStatus(status)
    resp.setContentType("application/json")
    resp.getWriter.write(
      Json.obj("id" -> id, "displayName" -> f.name, "mimeType" -> f.mimeType).toString
    )

  private def store(id: String, req: HttpServletRequest): Unit =
    val part = req.getPart("file")
    files.put(
      id,
      File(part.getSubmittedFileName, part.getContentType, part.getInputStream.readAllBytes())
    )

  override def service(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    failWith.filter(_._1 == req.getMethod) match
      case Some((_, status)) => resp.setStatus(status)
      case None              => super.service(req, resp)

  override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    val id = s"att-${sequence.incrementAndGet()}"
    store(id, req)
    describe(id, resp, 201)

  override def doPut(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    segments(req) match
      case List(id) if files.containsKey(id) =>
        store(id, req)
        describe(id, resp, 200)
      case _ => resp.setStatus(404)

  override def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    segments(req) match
      case List(id) if files.remove(id) != null => resp.setStatus(200)
      case _                                    => resp.setStatus(404)

  override def doGet(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    segments(req) match
      case List(id) if files.containsKey(id) => describe(id, resp, 200)
      case List(id, "download") if files.containsKey(id) =>
        val f = files.get(id)
        resp.setStatus(200)
        resp.setContentType(f.mimeType)
        resp.getOutputStream.write(f.content)
      case _ => resp.setStatus(404)
