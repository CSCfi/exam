// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import com.fasterxml.jackson.databind.JsonNode
import jakarta.servlet.http.HttpServletResponse
import jakarta.servlet.{MultipartConfigElement, Servlet}
import org.apache.commons.io.IOUtils
import org.eclipse.jetty.ee10.servlet.{ServletContextHandler, ServletHolder}
import org.eclipse.jetty.server.{Connector, Server, ServerConnector}
import play.api.libs.json.{JsValue, Json}

import java.io.{File, FileInputStream, IOException}
import java.nio.file.Files
import scala.util.Using

object RemoteServerHelper:
  sealed trait ServletDef:
    def bind(path: String, sch: ServletContextHandler): Unit

  object ServletDef:
    final case class FromClass(clazz: Class[? <: Servlet]) extends ServletDef:
      def bind(path: String, sch: ServletContextHandler): Unit =
        sch.getServletHandler.addServletWithMapping(clazz, path)

    final case class FromInstance(servlet: Servlet) extends ServletDef:
      def bind(path: String, sch: ServletContextHandler): Unit =
        sch.addServlet(new ServletHolder(servlet), path)

  def writeResponseFromFile(response: HttpServletResponse, filePath: String): Unit =
    response.setContentType("application/json")
    response.setStatus(HttpServletResponse.SC_OK)
    try
      Using
        .Manager { use =>
          val fis = use(new FileInputStream(new File(filePath)))
          val sos = use(response.getOutputStream)
          IOUtils.copy(fis, sos)
          sos.flush()
        }
        .recover { case _: IOException =>
          response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
        }
    catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

  def writeJsonResponse(response: HttpServletResponse, node: JsonNode, status: Int): Unit =
    response.setContentType("application/json")
    response.setStatus(status)
    try response.getWriter.write(node.toString)
    catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

  def writeJsonResponse(response: HttpServletResponse, jsValue: JsValue, status: Int): Unit =
    response.setContentType("application/json")
    response.setStatus(status)
    try response.getWriter.write(jsValue.toString)
    catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

  def writeEmptyJsonResponse(response: HttpServletResponse): Unit =
    response.setContentType("application/json")
    response.setStatus(HttpServletResponse.SC_OK)
    try
      Using(response.getWriter) { writer =>
        val data = Json.obj("data" -> Json.arr())
        writer.write(data.toString)
      }.recover { case _: IOException =>
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
      }
    catch case _: IOException => response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)

  def createServer(port: Int, multipart: Boolean, defs: (ServletDef, List[String])*): Server =
    val server               = new Server(port)
    val connector: Connector = new ServerConnector(server)
    server.addConnector(connector)
    server.setStopAtShutdown(true)
    val sch = new ServletContextHandler()
    sch.setContextPath("/")
    defs.foreach { case (servletDef, paths) =>
      paths.foreach(path => servletDef.bind(path, sch))
    }
    if multipart then
      val tempPath = Files.createTempDirectory("test_upload").toString
      sch.getServletHandler.getServletMappings.foreach { mapping =>
        val servlet = sch.getServletHandler.getServlet(mapping.getServletName)
        servlet.getRegistration.setMultipartConfig(new MultipartConfigElement(tempPath))
      }

    server.setHandler(sch)
    server.start()
    server

  def shutdownServer(server: Server): Unit =
    try server.stop()
    catch case e: Exception => throw new RuntimeException("Failed to shutdown server", e)
