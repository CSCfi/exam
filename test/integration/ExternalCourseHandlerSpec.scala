// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package integration

import base.BaseIntegrationSpec
import io.ebean.DB
import jakarta.servlet.http.{HttpServlet, HttpServletRequest, HttpServletResponse}
import database.EbeanQueryExtensions
import models.exam.{Course, Grade, GradeScale}
import models.facility.Organisation
import models.user.User
import org.apache.commons.io.IOUtils
import org.eclipse.jetty.ee10.servlet.{ServletContextHandler, ServletHolder}
import org.eclipse.jetty.server.{Connector, Server, ServerConnector}
import org.scalatest.{BeforeAndAfterAll, BeforeAndAfterEach}
import play.api.http.Status
import play.api.libs.json.JsArray

import java.io.{File, FileInputStream, IOException}
import scala.compiletime.uninitialized
import scala.util.Using

class ExternalCourseHandlerSpec
    extends BaseIntegrationSpec
    with BeforeAndAfterAll
    with BeforeAndAfterEach
    with EbeanQueryExtensions:

  private var server: Server = uninitialized

  class CourseInfoServlet extends HttpServlet:
    private var jsonFile: File = uninitialized

    def setFile(file: File): Unit = jsonFile = file

    override def doGet(request: HttpServletRequest, response: HttpServletResponse): Unit =
      response.setContentType("application/json")
      response.setStatus(HttpServletResponse.SC_OK)
      val result = Using.Manager { use =>
        val fis = use(new FileInputStream(jsonFile))
        val sos = use(response.getOutputStream)
        // Inject a BOM character to test that we can work with it
        sos.print('\ufeff')
        IOUtils.copy(fis, sos)
        sos.flush()
      }

      result.recover { case _: IOException =>
        response.setStatus(HttpServletResponse.SC_INTERNAL_SERVER_ERROR)
      }

  private val courseInfoServlet = new CourseInfoServlet()

  override def beforeAll(): Unit =
    super.beforeAll()
    server = new Server(31245)
    server.setStopAtShutdown(true)
    val connector: Connector = new ServerConnector(server)
    server.addConnector(connector)
    server.setStopAtShutdown(true)
    val handler = new ServletContextHandler()
    handler.setContextPath("/")
    handler.addServlet(new ServletHolder(courseInfoServlet), "/courseUnitInfo")
    handler.addServlet(new ServletHolder(courseInfoServlet), "/courseUnitInfo/oulu")
    server.setHandler(handler)
    server.start()

  override def afterAll(): Unit =
    try
      server.stop()
    finally
      super.afterAll()

  override def beforeEach(): Unit = super.beforeEach()

  private def setUserOrg(code: Option[String]): Unit =
    ensureTestDataLoaded()
    DB.find(classOf[User]).where().eq("eppn", "student@funet.fi").find match
      case Some(user) =>
        val org = code.flatMap(c => DB.find(classOf[Organisation]).where().eq("code", c).find)
        user.setOrganisation(org.orNull)
        user.update()
      case None => fail("User not found")

  "ExternalCourseHandler" when:
    "getting courses with default organisation" should:
      "return course with external grade scale" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 1

        val courseId = (coursesJson.value.head \ "id").as[Long]
        val course = Option(DB.find(classOf[Course], courseId)) match
          case Some(course) =>
            course.getCode must be("2121219_abcdefghijklmnop")
            course.getGradeScale.getType must be(GradeScale.Type.OTHER)
            course.getGradeScale.getDisplayName must be("0-5")
            course.getGradeScale.getExternalRef must be("9")
            course.getCreditsLanguage must be("fi")
            course
          case None => fail("Course not found")

        val grades = DB
          .find(classOf[Grade])
          .where()
          .eq("gradeScale.id", course.getGradeScale.getId)
          .list
        grades must have size 7
        grades.count(_.getMarksRejection) must be(1)

        // Check that the imported course got into db
        val savedCourse =
          DB.find(classOf[Course]).where().eq("code", "2121219_abcdefghijklmnop").find
        savedCourse must not be empty

      "return course with internal grade scale" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo4.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 1

        val courseId = (coursesJson.value.head \ "id").as[Long]
        Option(DB.find(classOf[Course], courseId)) match
          case Some(course) =>
            course.getCode must be("2121219_abcdefghijklmnop")
            course.getGradeScale.getType must be(GradeScale.Type.ZERO_TO_FIVE)
            Option(course.getGradeScale.getDisplayName) must be(None)
            Option(course.getGradeScale.getExternalRef) must be(None)
            course.getCreditsLanguage must be("fi")
          case None => fail("Course not found")
        // Check that the imported course got into db
        val savedCourse =
          DB.find(classOf[Course]).where().eq("code", "2121219_abcdefghijklmnop").find
        savedCourse must not be empty

      "return course with organisation from external data" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo3.json"))

        val result = runIO(get("/app/courses?filter=code&q=MAT21014", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 1

        val courseId = (coursesJson.value.head \ "id").as[Long]
        val course = Option(DB.find(classOf[Course], courseId)) match
          case Some(course) =>
            course.getCode must be("MAT21014_hy-CUR-138798147")
            course.getOrganisation.getName must be("Helsingin yliopisto")
            course.getGradeScale.getType must be(GradeScale.Type.OTHER)
            course.getGradeScale.getDisplayName must be("0-5")
            course.getGradeScale.getExternalRef must be("sis-0-5")
            course.getCreditsLanguage must be("en")
            course
          case None => fail("Course not found")
        val grades = DB
          .find(classOf[Grade])
          .where()
          .eq("gradeScale.id", course.getGradeScale.getId)
          .list
        grades must have size 6
        grades.count(_.getMarksRejection) must be(1)

        // Check that the imported course got into db
        val savedCourse =
          DB.find(classOf[Course]).where().eq("code", "MAT21014_hy-CUR-138798147").find match
            case Some(sc) =>
              sc.getGradeScale.getGrades must have size 6
            case None => fail("Course not found")

    "updating courses" should:
      "update existing course with new data" in:
        val (user, session) = runIO(loginAsAdmin())
        setUserOrg(None)

        // Import a new course
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"))
        runIO(get("/app/courses?filter=code&q=2121219", session = session))

        // Have it updated with new data
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfoUpdated.json"))
        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.OK))

        DB.find(classOf[Course]).where().eq("code", "2121219_abcdefghijklmnop").find match
          case Some(course) =>
            course.getName must endWith("2")
            course.getGradeScale.getDisplayName must be("1-2")
          case None => fail("Course not found")

    "searching for remote courses" should:
      "always search remote even when local course exists" in:
        val (user, session) = runIO(loginAsTeacher())
        // This is to make sure that we can import a course that shares the same prefix and has shorter code than a
        // course already found in db
        // remote code = 2121219_abcdefghijklmnop
        // local code = 2121219_abcdefghijklmnopq
        setUserOrg(None)

        val localCourse = new Course()
        localCourse.setCode("2121219_abcdefghijklmnopq")
        localCourse.save()

        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"))
        val result =
          runIO(get("/app/courses?filter=code&q=2121219_abcdefghijklmnop", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 2

        val course1Id = (coursesJson.value(0) \ "id").as[Long]
        Option(DB.find(classOf[Course], course1Id)) match
          case Some(course1) => course1.getCode must be("2121219_abcdefghijklmnop")
          case None          => fail("Course 1 not found")

        val course2Id = (coursesJson.value(1) \ "id").as[Long]
        Option(DB.find(classOf[Course], course2Id)) match
          case Some(course2) => course2.getCode must be("2121219_abcdefghijklmnopq")
          case None          => fail("Course 2 not found")

        // check that a remote course was added to the database
        val remoteCourse =
          DB.find(classOf[Course]).where().eq("code", "2121219_abcdefghijklmnop").find
        remoteCourse must not be empty

      "get course from another organisation" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(Some("oulu.fi"))

        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo2.json"))
        val result = runIO(get("/app/courses?filter=code&q=t7", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 1

        val courseId = (coursesJson.value.head \ "id").as[Long]
        Option(DB.find(classOf[Course], courseId)) match
          case Some(course) =>
            course.getCode must be("2121220")
            course.getGradeScale.getType must be(GradeScale.Type.OTHER)
            course.getGradeScale.getDisplayName must be("0-5")
            course.getGradeScale.getExternalRef must be("9")

            val grades = DB
              .find(classOf[Grade])
              .where()
              .eq("gradeScale.id", course.getGradeScale.getId)
              .list
            grades must have size 7
            grades.count(_.getMarksRejection) must be(1)
          case None => fail("Course not found")

      "get multiple courses" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfoMultiple.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must have size 8

        val course7Id = (coursesJson.value(6) \ "id").as[Long]
        Option(DB.find(classOf[Course], course7Id)) match
          case Some(course7) =>
            course7.getCode must be("T701203")
            course7.getIdentifier must be("AAAWMhAALAAAmaRAAE")
            course7.getCredits must be(3)
            course7.getName must be("Ohjelmoinnin jatkokurssi")
            course7.getOrganisation.getName must be("Oamk")
          case None => fail("Course 7 not found")

    "handling authorization" should:
      "deny access to students" in:
        val (user, session) = runIO(loginAsStudent())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.FORBIDDEN))

      "deny access to unauthenticated users" in:
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfo.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219"))
        statusOf(result).must(be(Status.UNAUTHORIZED))

    "handling expired courses" should:
      "return empty result for expired courses" in:
        val (user, session) = runIO(loginAsTeacher())
        setUserOrg(None)
        courseInfoServlet.setFile(new File("test/resources/courseUnitInfoExpired.json"))

        val result = runIO(get("/app/courses?filter=code&q=2121219", session = session))
        statusOf(result).must(be(Status.OK))

        val coursesJson = contentAsJsonOf(result).as[JsArray]
        coursesJson.value must be(empty)
