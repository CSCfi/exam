// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package exam

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.exam.{Course, Exam}
import models.user.User
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import java.time.temporal.ChronoUnit.DAYS
import java.util.Date

/** Finding courses for an exam, and the courses of a teacher's exams */
class CourseSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def call(url: String, session: Session): Result =
    runIO(makeRequest("GET", url, session = session))

  private def codes(result: Result): Seq[String] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[Seq[JsObject]].map(j => (j \ "code").as[String])

  private def course(code: String, name: String, start: Option[Instant], end: Option[Instant]) =
    val c = new Course
    c.code = code
    c.name = name
    c.startDate = start.map(Date.from).orNull
    c.endDate = end.map(Date.from).orNull
    c.save()
    c

  private def olli: User = DB.find(classOf[User]).where().eq("eppn", "teacher@funet.fi").find.get

  "Searching courses by name" when:
    "some are over or yet to start" should:
      "find only the ones running now" in:
        val (_, session) = runIO(loginAsTeacher())
        val now          = Instant.now()
        course("RUN-1", "Perusteet käynnissä", Some(now.minus(10, DAYS)), Some(now.plus(10, DAYS)))
        course("OVER-1", "Perusteet ohi", Some(now.minus(90, DAYS)), Some(now.minus(1, DAYS)))
        course("SOON-1", "Perusteet tulossa", Some(now.plus(30, DAYS)), None)

        val found = codes(call("/app/courses?filter=name&q=perus", session))
        found must contain allOf ("810136P", "811380A", "RUN-1")
        found must contain noneOf ("OVER-1", "SOON-1")

    "the search is too short" should:
      "be refused" in:
        val (_, session) = runIO(loginAsTeacher())
        val result       = call("/app/courses?filter=name&q=p", session)
        statusOf(result) must be(Status.BAD_REQUEST)
        contentAsStringOf(result) must include("minimum 2 characters")

  "Courses" when:
    "listed or opened" should:
      "give the named ones, and one by id" in:
        val (_, session) = runIO(loginAsTeacher())
        course("NONAME-1", null, None, None)

        val all = codes(call("/app/courses", session))
        all must contain allOf ("810136P", "811380A")
        all must not contain "NONAME-1"
        val one = call("/app/courses/1", session)
        (contentAsJsonOf(one) \ "code").as[String] must be("810136P")
        statusOf(call("/app/courses/999999", session)) must be(Status.NOT_FOUND)

    "a student asks" should:
      "be refused" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(call("/app/courses", session)) must be(Status.FORBIDDEN)

  "A teacher's courses" when:
    "listed for the exam filters" should:
      "be those of the exams they own, narrowed by the filters" in:
        val (_, session) = runIO(loginAsTeacher())
        val other        = course("OTHER-1", "Toisen kurssi", None, None)
        // The test data gives no exam owners
        val mine = DB.find(classOf[Exam], 1L)
        mine.examOwners.add(olli)
        mine.update()
        val theirs = DB.find(classOf[Exam], 2L)
        theirs.course = other
        theirs.examOwners.clear()
        theirs.update()

        codes(call("/app/courses/user", session)) must be(Seq("810136P"))
        codes(call("/app/courses/user?examIds=1", session)) must be(Seq("810136P"))
        codes(call(s"/app/courses/user?examIds=${theirs.id}", session)) must be(empty)
        codes(call(s"/app/courses/user?ownerIds=${olli.id}", session)) must be(Seq("810136P"))

      "be all courses with exams for an administrator" in:
        val (_, session) = runIO(loginAsAdmin())
        codes(call("/app/courses/user", session)) must contain("810136P")
