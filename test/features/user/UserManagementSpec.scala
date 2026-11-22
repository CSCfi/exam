// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.user

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.questions.Question
import models.user.*
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.time.Instant
import scala.jdk.CollectionConverters.*

/** What administrators and teachers do with user accounts */
class UserManagementSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def user(eppn: String): User = DB.find(classOf[User]).where().eq("eppn", eppn).find.get
  private def olli: User               = user("teacher@funet.fi")
  private def arvo: User               = user("teacher@b.funet.fi")
  private def sauli: User              = user("student@funet.fi")

  private def call(
      method: String,
      url: String,
      session: Session,
      body: Option[JsValue] = None
  ): Result = runIO(makeRequest(method, url, body, session = session))

  private def ids(result: Result): Seq[Long] =
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[Seq[JsObject]].map(j => (j \ "id").as[Long])

  private def permission(t: PermissionType): Permission =
    val p = new Permission
    p.`type` = t
    p.save()
    p

  private def permissionsOf(u: User): Seq[PermissionType] =
    DB.find(classOf[User], u.id).permissions.asScala.map(_.`type`).toSeq

  private def rolesOf(u: User): Seq[String] =
    DB.find(classOf[User], u.id).roles.asScala.map(_.name).toSeq

  "Permissions" when:
    "an administrator manages them" should:
      "grant and revoke one, once each" in:
        val (_, session) = runIO(loginAsAdmin())
        permission(PermissionType.CAN_INSPECT_LANGUAGE)
        val body = Some(Json.obj("id" -> olli.id.longValue, "permission" -> "CAN_INSPECT_LANGUAGE"))

        contentAsJsonOf(call("GET", "/app/permissions", session)).as[JsArray].value must have size 1
        statusOf(call("POST", "/app/permissions", session, body)) must be(Status.OK)
        statusOf(call("POST", "/app/permissions", session, body)) must be(Status.OK)
        permissionsOf(olli) must be(Seq(PermissionType.CAN_INSPECT_LANGUAGE))

        statusOf(call("DELETE", "/app/permissions", session, body)) must be(Status.OK)
        statusOf(call("DELETE", "/app/permissions", session, body)) must be(Status.OK)
        permissionsOf(olli) must be(empty)

      "refuse an unknown user or permission" in:
        val (_, session) = runIO(loginAsAdmin())
        def grant(id: Long, p: String) =
          statusOf(call(
            "POST",
            "/app/permissions",
            session,
            Some(Json.obj("id" -> id, "permission" -> p))
          ))

        grant(999999, "CAN_INSPECT_LANGUAGE") must be(Status.NOT_FOUND)
        grant(olli.id, "CAN_FLY") must be(Status.BAD_REQUEST)
        // A known type that has no row in the database
        grant(olli.id, "CAN_CREATE_BYOD_EXAM") must be(Status.NOT_FOUND)

    "a teacher asks" should:
      "be refused" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(call("GET", "/app/permissions", session)) must be(Status.FORBIDDEN)
        statusOf(call(
          "POST",
          "/app/permissions",
          session,
          Some(Json.obj("id" -> olli.id.longValue, "permission" -> "CAN_INSPECT_LANGUAGE"))
        )) must be(Status.FORBIDDEN)

  "Roles" when:
    "an administrator manages them" should:
      "add and remove one, once each" in:
        val (_, session) = runIO(loginAsAdmin())
        val url          = s"/app/users/${olli.id}/roles/ADMIN"

        statusOf(call("POST", url, session)) must be(Status.OK)
        statusOf(call("POST", url, session)) must be(Status.OK)
        rolesOf(olli) must contain theSameElementsAs Seq("TEACHER", "ADMIN")
        statusOf(call("DELETE", url, session)) must be(Status.OK)
        statusOf(call("DELETE", url, session)) must be(Status.OK)
        rolesOf(olli) must be(Seq("TEACHER"))

      "refuse an unknown user or role" in:
        val (_, session) = runIO(loginAsAdmin())
        statusOf(call("POST", "/app/users/999999/roles/ADMIN", session)) must be(Status.NOT_FOUND)
        statusOf(call("POST", s"/app/users/${olli.id}/roles/WIZARD", session)) must be(
          Status.NOT_FOUND
        )
        statusOf(call("DELETE", "/app/users/999999/roles/ADMIN", session)) must be(
          Status.NOT_FOUND
        )

    "support staff manage them" should:
      // Open gap: support may make anyone, themselves included, an administrator
      "let them grant the administrator role" in:
        ensureTestDataLoaded()
        val support = Role.withName(Role.Name.SUPPORT.toString)
        support.save()
        val olliNow = olli
        olliNow.roles.clear()
        olliNow.roles.add(support)
        olliNow.update()
        val (_, session) = runIO(loginAsTeacher())
        session.get("role") must be(Some("SUPPORT"))

        statusOf(call("POST", s"/app/users/${olli.id}/roles/ADMIN", session)) must be(Status.OK)
        rolesOf(olli) must contain("ADMIN")

    "a teacher asks" should:
      "be refused" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(call("POST", s"/app/users/${olli.id}/roles/ADMIN", session)) must be(
          Status.FORBIDDEN
        )
        statusOf(call("GET", "/app/users", session)) must be(Status.FORBIDDEN)

  "Finding users" when:
    "an administrator searches" should:
      "match names, email and identifiers" in:
        val (_, session) = runIO(loginAsAdmin())
        val sauliNow     = sauli
        sauliNow.userIdentifier = "org1.org:98765"
        sauliNow.employeeNumber = "E-4242"
        sauliNow.update()

        ids(call("GET", "/app/users?filter=Sauli%20Student", session)) must be(Seq(sauli.id))
        ids(call("GET", "/app/users?filter=student@funet", session)) must be(Seq(sauli.id))
        ids(call("GET", "/app/users?filter=98765", session)) must be(Seq(sauli.id))
        ids(call("GET", "/app/users?filter=E-4242", session)) must be(Seq(sauli.id))
        ids(call("GET", "/app/users", session)) must contain allOf (olli.id, arvo.id, sauli.id)

      "list a role's users, with their roles" in:
        val (_, session) = runIO(loginAsAdmin())
        val result       = call("GET", "/app/users/byrole/TEACHER", session)

        ids(result) must contain theSameElementsAs Seq(olli.id, arvo.id)
        (contentAsJsonOf(result).as[Seq[JsObject]].head \ "roles").as[JsArray].value must not be
          empty

    "a teacher searches" should:
      "find teachers by name" in:
        val (_, session) = runIO(loginAsTeacher())
        ids(call("GET", "/app/users/teachers?q=Arvon", session)) must be(Seq(arvo.id))
        ids(call("GET", "/app/users/teachers?q=Penaali%20Arvon", session)) must be(Seq(arvo.id))
        ids(call("GET", "/app/users/teachers?q=Sauli", session)) must be(empty)

      "leave out a question's owners and themselves when finding owners for it" in:
        val (_, session) = runIO(loginAsTeacher())
        val question     = DB.find(classOf[Question]).setMaxRows(1).findOne()
        question.questionOwners = new java.util.HashSet(List(arvo).asJava)
        question.update()
        val url = "/app/users/question/owners/TEACHER?q=e"

        ids(call("GET", url, session)) must be(Seq(arvo.id))
        ids(call("GET", s"$url&qid=${question.id}", session)) must be(empty)
        statusOf(call("GET", s"$url&qid=999999", session)) must be(Status.NOT_FOUND)

      "find the students not yet enrolled in an exam" in:
        val (_, session) = runIO(loginAsTeacher())
        val exam         = DB.find(classOf[Exam], 1L)
        val url          = s"/app/students/${exam.id}?q=Sauli"
        DB.find(classOf[ExamEnrolment]).where().eq("exam.id", exam.id).delete()

        ids(call("GET", url, session)) must be(Seq(sauli.id))
        val enrolment = new ExamEnrolment
        enrolment.exam = exam
        enrolment.user = sauli
        enrolment.enrolledOn = Instant.now()
        enrolment.save()
        ids(call("GET", url, session)) must be(empty)

    "a student searches" should:
      "be refused" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(call("GET", "/app/users/teachers?q=Olli", session)) must be(Status.FORBIDDEN)

  "A user's own settings" when:
    "they accept the user agreement" should:
      "remember it" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(call("PUT", "/app/users/agreement", session)) must be(Status.OK)
        DB.find(classOf[User], sauli.id).userAgreementAccepted must be(true)

    "they change their language" should:
      "take a supported one only" in:
        val (_, session) = runIO(loginAsStudent())
        statusOf(call("PUT", "/app/user/lang", session, Some(Json.obj("lang" -> "sv")))) must be(
          Status.OK
        )
        DB.find(classOf[User], sauli.id).language.code must be("sv")
        statusOf(call("PUT", "/app/user/lang", session, Some(Json.obj("lang" -> "xx")))) must be(
          Status.BAD_REQUEST
        )
        DB.find(classOf[User], sauli.id).language.code must be("sv")
