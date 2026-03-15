// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import com.fasterxml.jackson.databind.node.ObjectNode
import jakarta.servlet.ServletException
import jakarta.servlet.http.{HttpServletRequest, HttpServletResponse}
import models.exam.Exam
import play.api.libs.json.Json
import services.json.{EbeanMapper, JsonDeserializer}

import java.io.IOException
import java.util.concurrent.Semaphore
import scala.compiletime.uninitialized
import scala.jdk.StreamConverters.*

class ExamServlet extends BaseServlet:

  private var exam: Exam = uninitialized
  waiter = new Semaphore(0)

  @throws[ServletException]
  @throws[IOException]
  override protected def service(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    ExamServlet.calledMethod = req.getMethod
    super.service(req, resp)

  override protected def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
    if exam == null then
      response.setStatus(HttpServletResponse.SC_NOT_FOUND)
    else
      val mapper = EbeanMapper.create()
      val json   = mapper.readTree(mapper.writeValueAsString(exam)).asInstanceOf[ObjectNode]
      json.put("_rev", 1)
      RemoteServerHelper.writeJsonResponse(
        response,
        Json.parse(json.toString),
        HttpServletResponse.SC_OK
      )
      waiter.release()

  override protected def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    resp.setStatus(HttpServletResponse.SC_BAD_REQUEST)

  @throws[IOException]
  override protected def doPut(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    val json = req.getReader.lines().toScala(LazyList).mkString
    exam = JsonDeserializer.deserialize(classOf[Exam], play.libs.Json.parse(json))
    resp.setStatus(200)
    waiter.release()

  override protected def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    exam = null
    resp.setStatus(HttpServletResponse.SC_OK)

  override def getLastCallMethod: String =
    val call = ExamServlet.calledMethod
    ExamServlet.calledMethod = null
    call

  override def setWaiter(waiter: Semaphore): Unit =
    this.waiter = waiter

  override def getWaiter: Semaphore = waiter

  def getExam: Exam = exam

  def setExam(exam: Exam): Unit =
    this.exam = exam

object ExamServlet:
  private var calledMethod: String = uninitialized
