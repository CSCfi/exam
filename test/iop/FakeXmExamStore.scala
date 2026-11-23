// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import play.api.libs.json.*

import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.atomic.AtomicInteger
import scala.jdk.CollectionConverters.*

/** XM's exam store (`/api/exams`), CouchDB style: documents carry `_id` and `_rev`, and an update
  * must name the current revision. Assessments of an exam are kept under `<exam
  * ref>/assessments/<assessment ref>`.
  */
class FakeXmExamStore extends HttpServlet:
  private val docs     = new ConcurrentHashMap[String, JsObject]()
  private val revs     = new ConcurrentHashMap[String, Integer]()
  private val sequence = new AtomicInteger()

  /** When set, every request is answered with this status and an error message. */
  @volatile var failWith: Option[Int] = None

  /** When set, updates are answered with this status. */
  @volatile var failPutsWith: Option[Int] = None

  def reset(): Unit =
    docs.clear()
    revs.clear()
    failWith = None
    failPutsWith = None

  def put(ref: String, doc: JsObject): Unit =
    docs.put(ref, doc - "_id" - "_rev" - "rev")
    revs.merge(ref, 1, (a, b) => a + b)

  def get(ref: String): Option[JsObject] = Option(docs.get(ref))

  def putAssessment(examRef: String, ref: String, doc: JsObject): Unit =
    put(s"$examRef/assessments/$ref", doc)

  def assessment(examRef: String, ref: String): Option[JsObject] =
    get(s"$examRef/assessments/$ref")

  def update(ref: String)(f: JsObject => JsObject): Unit = put(ref, f(docs.get(ref)))

  private def rev(ref: String) = s"${revs.get(ref)}-rev"

  private def withMeta(key: String): JsObject =
    docs.get(key) ++ Json.obj("_id" -> key.split('/').last, "_rev" -> rev(key))

  private def exams: List[String] = docs.keys.asScala.toList.filterNot(_.contains('/')).sorted

  private def ref(req: HttpServletRequest): Option[String] =
    Option(req.getPathInfo).map(_.stripPrefix("/")).filter(_.nonEmpty)

  private def body(req: HttpServletRequest): JsObject =
    Json.parse(new String(req.getInputStream.readAllBytes())).as[JsObject]

  private def respond(resp: HttpServletResponse, status: Int, json: JsValue): Unit =
    resp.setStatus(status)
    resp.setContentType("application/json")
    resp.getWriter.write(json.toString)

  private def notFound(resp: HttpServletResponse) =
    respond(resp, 404, Json.obj("message" -> "not found"))

  override def service(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    failWith.orElse(failPutsWith.filter(_ => req.getMethod == "PUT")) match
      case Some(status) => respond(resp, status, Json.obj("message" -> "XM failure"))
      case None         => super.service(req, resp)

  override def doGet(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    ref(req) match
      case Some("search") =>
        val filter = Option(req.getParameter("filter")).getOrElse("").toLowerCase
        val found = exams.map(withMeta).filter(d =>
          (d \ "name").asOpt[String].exists(_.toLowerCase.contains(filter))
        )
        respond(resp, 200, JsArray(found))
      case Some(r) if r.endsWith("/assessments") =>
        val found = docs.keys.asScala.toList.filter(_.startsWith(s"$r/")).sorted
        respond(resp, 200, JsArray(found.map(withMeta)))
      case Some(r) if docs.containsKey(r) => respond(resp, 200, withMeta(r))
      case Some(_)                        => notFound(resp)
      case None                           => respond(resp, 200, JsArray(exams.map(withMeta)))

  override def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    val r = s"xm-exam-${sequence.incrementAndGet()}"
    put(r, body(req))
    respond(resp, 201, Json.obj("id" -> r, "rev" -> rev(r)))

  override def doPut(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    ref(req).filter(docs.containsKey) match
      case None => notFound(resp)
      case Some(r) =>
        val doc = body(req)
        if !(doc \ "rev").asOpt[String].contains(rev(r)) then
          respond(resp, 409, Json.obj("message" -> "Document update conflict."))
        else
          put(r, doc)
          respond(resp, 200, Json.obj("rev" -> rev(r)))

  override def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    ref(req).filter(docs.containsKey) match
      case None => notFound(resp)
      case Some(r) =>
        docs.remove(r)
        respond(resp, 200, Json.obj("ok" -> true))
