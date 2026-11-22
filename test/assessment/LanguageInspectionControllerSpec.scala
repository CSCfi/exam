// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package assessment

import base.BaseIntegrationSpec
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.LanguageInspection
import models.exam.Exam
import models.user.{Permission, PermissionType, User}
import play.api.http.Status
import play.api.libs.json.*
import play.api.mvc.{Result, Session}

import java.net.URLEncoder
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.util.Date

class LanguageInspectionControllerSpec extends BaseIntegrationSpec with EbeanQueryExtensions:

  private def studentCopies: List[Exam] =
    DB.find(classOf[Exam]).where().isNotNull("parent").orderBy("id").list

  /** A student's copy of a maturity exam, waiting to be sent to inspection */
  private def maturityCopy(index: Int = 0): Exam =
    val e = studentCopies(index)
    e.subjectToLanguageInspection = true
    e.update()
    e

  /** The teacher with the right to inspect language, logged in again as the session holds them */
  private def loginAsInspector(): (User, Session) =
    val (teacher, _) = runIO(loginAsTeacher())
    val permission   = new Permission
    permission.`type` = PermissionType.CAN_INSPECT_LANGUAGE
    permission.save()
    teacher.permissions.add(permission)
    teacher.update()
    runIO(loginAsTeacher())

  private def send(examId: Long, session: Session): Result =
    runIO(makeRequest(
      "POST",
      "/app/inspection",
      Some(Json.obj("examId" -> examId)),
      session = session
    ))

  private def update(url: String, body: JsValue, session: Session): Result =
    runIO(makeRequest("PUT", url, Some(body), session = session))

  private def inspectionOf(e: Exam): LanguageInspection =
    DB.find(classOf[LanguageInspection]).where().eq("exam.id", e.id).find
      .getOrElse(fail("No inspection found"))

  /** Any exams, for inspections made directly in the database */
  private def exams: List[Exam] =
    DB.find(classOf[Exam]).where().ne("state", models.exam.ExamState.DELETED).orderBy("id").list

  private def finishedOn(e: Exam, at: Instant): Unit =
    val li = new LanguageInspection
    li.exam = e
    li.startedAt = Date.from(at.minusSeconds(3600))
    li.finishedAt = Date.from(at)
    li.approved = true
    li.save()

  private def listed(query: String, session: Session): Seq[Long] =
    val result = runIO(makeRequest("GET", s"/app/inspections?$query", session = session))
    statusOf(result) must be(Status.OK)
    contentAsJsonOf(result).as[JsArray].value.map(li => (li \ "exam" \ "id").as[Long]).toSeq

  "LanguageInspectionController" when:
    "sending an exam to inspection" should:
      "create the inspection once" in:
        val (teacher, session) = runIO(loginAsTeacher())
        val e                  = maturityCopy()

        statusOf(send(e.id, session)) must be(Status.OK)
        inspectionOf(e).creator.id must be(teacher.id)

        val again = send(e.id, session)
        statusOf(again) must be(Status.FORBIDDEN)
        DB.find(classOf[LanguageInspection]).where().eq("exam.id", e.id).list must have size 1

      "refuse an exam that is not subject to inspection" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = studentCopies.head
        e.subjectToLanguageInspection = false
        e.update()

        statusOf(send(e.id, session)) must be(Status.FORBIDDEN)

      "refuse an unknown exam" in:
        val (_, session) = runIO(loginAsTeacher())
        statusOf(send(999999L, session)) must be(Status.BAD_REQUEST)

    "inspecting" should:
      "take the inspection, give a statement and then the approval" in:
        val (_, teacherSession) = runIO(loginAsTeacher())
        val e                   = maturityCopy()
        statusOf(send(e.id, teacherSession)) must be(Status.OK)
        val (inspector, session) = loginAsInspector()
        val id                   = inspectionOf(e).id

        statusOf(update(s"/app/inspection/$id", Json.obj(), session)) must be(Status.OK)
        inspectionOf(e).assignee.id must be(inspector.id)
        // Taken already
        statusOf(update(s"/app/inspection/$id", Json.obj(), session)) must be(Status.FORBIDDEN)

        // No statement yet
        val early = update(s"/app/inspection/$id/approval", Json.obj("approved" -> true), session)
        statusOf(early) must be(Status.FORBIDDEN)

        val statement =
          update(s"/app/inspection/$id/statement", Json.obj("comment" -> "<p>Fluent</p>"), session)
        statusOf(statement) must be(Status.OK)
        statusOf(
          update(s"/app/inspection/$id/approval", Json.obj("approved" -> true), session)
        ) must be(
          Status.OK
        )

        val done = inspectionOf(e)
        done.approved.booleanValue must be(true)
        done.finishedAt must not be null
        done.statement.comment must include("Fluent")
        // Final once approved
        statusOf(
          update(s"/app/inspection/$id/statement", Json.obj("comment" -> "Changed"), session)
        ) must be(
          Status.FORBIDDEN
        )
        statusOf(
          update(s"/app/inspection/$id/approval", Json.obj("approved" -> false), session)
        ) must be(
          Status.FORBIDDEN
        )

      "not accept a statement before the inspection is taken" in:
        val (_, teacherSession) = runIO(loginAsTeacher())
        val e                   = maturityCopy()
        statusOf(send(e.id, teacherSession)) must be(Status.OK)
        val (_, session) = loginAsInspector()

        val result = update(
          s"/app/inspection/${inspectionOf(e).id}/statement",
          Json.obj("comment" -> "x"),
          session
        )
        statusOf(result) must be(Status.FORBIDDEN)

      "be closed to teachers without the right to inspect" in:
        val (_, session) = runIO(loginAsTeacher())
        val e            = maturityCopy()
        statusOf(send(e.id, session)) must be(Status.OK)

        statusOf(update(s"/app/inspection/${inspectionOf(e).id}", Json.obj(), session)) must be(
          Status.FORBIDDEN
        )

      "answer 404 for an unknown inspection" in:
        val (_, session) = loginAsInspector()
        statusOf(update("/app/inspection/999999", Json.obj(), session)) must be(Status.NOT_FOUND)

    "listing finished inspections" should:
      "list the chosen month on the viewer's clock" in:
        val (_, session) = runIO(loginAsAdmin())
        // 00:30 on 1 June in Finland, still May in UTC
        finishedOn(exams(0), Instant.parse("2030-05-31T21:30:00Z"))
        finishedOn(exams(1), Instant.parse("2030-05-15T10:00:00Z"))
        // Encoded twice like the browser does: encodeURIComponent, then HttpParams
        val june = List(1, 2).foldLeft("2030-06-01T00:00:00.000+03:00")((v, _) =>
          URLEncoder.encode(v, StandardCharsets.UTF_8)
        )

        listed(s"month=$june", session) must be(Seq(exams(0).id))

      "list a range of days" in:
        val (_, session) = runIO(loginAsAdmin())
        finishedOn(exams(0), Instant.parse("2030-06-10T10:00:00Z"))
        finishedOn(exams(1), Instant.parse("2030-06-20T10:00:00Z"))
        val start = Instant.parse("2030-06-09T21:00:00Z").toEpochMilli
        val end   = Instant.parse("2030-06-15T21:00:00Z").toEpochMilli

        listed(s"start=$start&end=$end", session) must be(Seq(exams(0).id))
