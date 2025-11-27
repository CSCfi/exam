// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import base.BaseIntegrationSpec
import com.fasterxml.jackson.databind.{JsonNode, ObjectMapper}
import helpers.RemoteServerHelper
import io.ebean.DB
import jakarta.servlet.{ServletException, http}
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse, Part}
import miscellaneous.scala.DbApiHelper
import models.attachment.Attachment
import models.base.GeneratedIdentityModel
import models.questions.{Question, Tag}
import models.user.User
import net.jodah.concurrentunit.Waiter
import org.eclipse.jetty.server.Server
import org.scalatest.{BeforeAndAfterAll, Ignore}
import org.scalatest.matchers.must.Matchers
import play.api.http.Status
import play.api.libs.json.{JsArray, JsObject, Json}
import play.api.test.Helpers.*

import java.io.{File, IOException}
import java.util.Objects
import java.util.concurrent.TimeoutException
import scala.compiletime.uninitialized
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

class DataTransferControllerSpec extends BaseIntegrationSpec with BeforeAndAfterAll with Matchers with DbApiHelper:

  private val ORG_REF              = "thisissomeorgref"
  private lazy val testImage: File = getTestFile("test_files/test_image.png")
  private var server: Server       = uninitialized

  class DataTransferServlet extends HttpServlet:
    override def doPost(request: HttpServletRequest, response: HttpServletResponse): Unit =
      val responseJson = Json.obj(
        "ids" -> Json.arr(
          Json.obj("src" -> 1, "dst" -> 1000)
        )
      )
      RemoteServerHelper.writeJsonResponse(response, responseJson, HttpServletResponse.SC_CREATED)

  class DataTransferAttachmentServlet extends HttpServlet:
    val waiter = new Waiter()

    @throws[ServletException]
    @throws[IOException]
    override def doPost(request: HttpServletRequest, response: HttpServletResponse): Unit =
      response.setStatus(HttpServletResponse.SC_CREATED)
      val filePart = request.getPart("file")
      waiter.assertEquals(testImage.getName, filePart.getSubmittedFileName)
      waiter.assertEquals("image/png", filePart.getContentType)
      waiter.resume()

  private lazy val dataTransferServlet = new DataTransferServlet()
  private lazy val attachmentServlet   = new DataTransferAttachmentServlet()

  override def beforeAll(): Unit =
    super.beforeAll()
    val baseUrl1 = s"/api/organisations/$ORG_REF/export"
    val baseUrl2 = s"/api/organisations/$ORG_REF/export/1000/attachment"
    server = RemoteServerHelper.createAndStartServer(
      31247,
      Map(
        classOf[DataTransferServlet]           -> List(baseUrl1),
        classOf[DataTransferAttachmentServlet] -> List(baseUrl2)
      ),
      setMultipart = true
    )

  override def afterAll(): Unit =
    try
      RemoteServerHelper.shutdownServer(server)
    finally
      super.afterAll()

  protected def getTestFile(s: String): File =
    val classLoader = this.getClass.getClassLoader
    new File(Objects.requireNonNull(classLoader.getResource(s)).getFile)

  protected def createAttachment(fileName: String, filePath: String, mimeType: String): Attachment =
    val attachment = new Attachment()
    attachment.setFileName(fileName)
    attachment.setFilePath(filePath)
    attachment.setMimeType(mimeType)
    attachment.save()
    attachment

  protected def getLoggerUser: User =
    Option(DB.find(classOf[User], 5L)) match
      case Some(user) => user
      case None       => fail("Test user with ID 5 not found")

  "DataTransferController" when:
    "exporting questions" should:
      "export question successfully" in:
        loginAsTeacher().map { case (user, session) =>
          val questions = DB
            .find(classOf[Question])
            .where()
            .or()
            .eq("questionOwners", user)
            .eq("creator", user)
            .endOr()
            .list

          val questionIds = questions.map(_.getId.longValue).toSet
          val idsArray    = JsArray(questionIds.map(Json.toJson(_: Long)).toSeq)

          val body = Json.obj(
            "type"   -> "QUESTION",
            "orgRef" -> ORG_REF,
            "ids"    -> idsArray
          )

          val result = makeRequest(POST, "/app/iop/export", Some(body), session = session)
          status(result) must be(Status.CREATED)
        }

      "export question with attachment successfully" in:
        loginAsTeacher().flatMap { case (user, session) =>
          val questions = DB
            .find(classOf[Question])
            .where()
            .or()
            .eq("questionOwners", user)
            .eq("creator", user)
            .endOr()
            .list

          val q = questions.headOption.getOrElse(fail("No questions found for user"))

          val attachment = createAttachment("test_image.png", testImage.getAbsolutePath, "image/png")
          q.setAttachment(attachment)
          q.save()

          val questionIds = Set(q.getId.longValue)
          val idsArray    = JsArray(questionIds.map(Json.toJson(_: Long)).toSeq)

          val body = Json.obj(
            "type"   -> "QUESTION",
            "orgRef" -> ORG_REF,
            "ids"    -> idsArray
          )

          val result = makeRequest(POST, "/app/iop/export", Some(body), session = session)

          Future {
            attachmentServlet.waiter.await(10000, 1)
            status(result) must be(Status.CREATED)
          }
        }

    "importing questions" should:
      "import question successfully" in:
        val mapper = new ObjectMapper()
        val from   = new File("test/resources/questionImport.json")
        val json   = mapper.readTree(from)

        val result = makeRequest(POST, "/integration/iop/import", body = Some(Json.parse(json.toString)))
        status(result) must be(Status.CREATED)

        val importedCount = DB.find(classOf[Question]).where().like("question", "% **import").list.size
        importedCount must be(22)

      "import question with tags successfully" in:
        ensureTestDataLoaded()
        val user = DB.find(classOf[User]).where().eq("email", "teacher@funet.fi").find match
          case Some(u) => u
          case None    => fail("Teacher user not found")

        val existing = new Tag()
        existing.setCreatorWithDate(user)
        existing.setModifierWithDate(user)
        existing.setName("koira")
        existing.save()

        val mapper = new ObjectMapper()
        val from   = new File("test/resources/questionImportWithTags.json")
        val json   = mapper.readTree(from)

        val result = makeRequest(POST, "/integration/iop/import", body = Some(Json.parse(json.toString)))
        status(result) must be(Status.CREATED)

        val importedQuestion = DB.find(classOf[Question]).where().like("question", "% **import").find match
          case Some(q) => q
          case None    => fail("Imported question not found")

        importedQuestion.getTags.size must be(2)

      "import question with attachment (does not work like this anymore)" ignore:
        val mapper = new ObjectMapper()
        val from   = new File("test/resources/questionImportWithAttachment.json")
        val json   = mapper.readTree(from)

        val result = makeRequest(POST, "/integration/iop/import", body = Some(Json.parse(json.toString)))
        status(result) must be(Status.CREATED)

        val importedQuestion = DB.find(classOf[Question]).where().like("question", "% **import").find match
          case Some(q) => q
          case None    => fail("Imported question not found")

        importedQuestion.getAttachment must not be null
