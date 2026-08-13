// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import jakarta.servlet.ServletException
import jakarta.servlet.http.{HttpServletRequest, HttpServletResponse}
import org.apache.commons.io.IOUtils

import java.io.{File, FileInputStream, IOException}
import java.util.Objects
import java.util.concurrent.Semaphore
import scala.util.Using

class AttachmentServlet(private var testFile: File) extends BaseServlet:

  def this() =
    this({
      val classLoader = classOf[AttachmentServlet].getClassLoader
      new File(Objects.requireNonNull(classLoader.getResource("test_files/test_image.png")).getFile)
    })
    waiter = new Semaphore(0)

  @throws[ServletException]
  @throws[IOException]
  override protected def service(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    BaseServlet.calledMethod = req.getMethod
    super.service(req, resp)

  override protected def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
    response.setContentType("image/png")
    response.setHeader("Content-Disposition", "attachment; filename=\"test_image.png\"")
    response.setStatus(HttpServletResponse.SC_OK)

    Using
      .Manager { use =>
        val fis = use(new FileInputStream(testFile))
        val sos = use(response.getOutputStream)
        IOUtils.copy(fis, sos)
        sos.flush()
      }
      .recover { case _: IOException =>
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
      }

    waiter.release()

  @throws[IOException]
  @throws[ServletException]
  override protected def doPost(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    if req.getHeader("Content-Type").toLowerCase.startsWith("multipart/form-data") then
      req.getPart("file")

    resp.setStatus(HttpServletResponse.SC_CREATED)
    resp.getWriter.write(
      """{"id": "abcdefg123456", "displayName": "test_image.png", "mimeType": "image/png"}"""
    )
    resp.getWriter.flush()

  @throws[IOException]
  @throws[ServletException]
  override protected def doPut(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    val filePart = req.getPart("file")
    filePart.write(filePart.getSubmittedFileName)
    resp.setStatus(HttpServletResponse.SC_OK)
    waiter.release()

  override protected def doDelete(req: HttpServletRequest, resp: HttpServletResponse): Unit =
    resp.setStatus(HttpServletResponse.SC_OK)
