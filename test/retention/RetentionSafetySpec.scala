// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package retention

import io.ebean.DB
import models.exam.{Exam, ExaminationDate}
import models.facility.Software
import models.questions.{Question, Tag}
import models.user.*
import play.api.libs.json.Json

import java.nio.file.{Files, Path}
import scala.jdk.CollectionConverters.*

/** Guards against deleting too much. A real run must remove or change only rows that belong to the
  * one student whose retention has ended, whatever the table.
  */
class RetentionSafetySpec extends RetentionSpecBase:

  private type Row = (String, String) // table name, row as JSON

  /** Every row of every table except Play's evolution bookkeeping. */
  private def snapshot(): Set[Row] =
    val tables = DB
      .sqlQuery(
        """SELECT table_name FROM information_schema.tables
          |WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
          |AND table_name <> 'play_evolutions'""".stripMargin
      )
      .findList()
      .asScala
      .map(_.getString("table_name"))
    tables.flatMap { t =>
      DB.sqlQuery(s"""SELECT to_jsonb(x)::text AS r FROM "$t" x""").findList().asScala
        .map(r => t -> r.getString("r"))
    }.toSet

  private def rowId(row: Row): Option[(String, Long)] =
    (Json.parse(row._2) \ "id").asOpt[Long].map(row._1 -> _)

  private def teacher(): User =
    DB.find(classOf[User]).where().eq("email", "teacher@funet.fi").find.getOrElse(fail(
      "No teacher"
    ))

  /** Gives the prototype exam and its questions the kinds of shared data that cascades could reach:
    * softwares, languages, owners, examination dates, question tags, owners and attachments.
    */
  private def enrichSharedData(): Unit =
    val t       = teacher()
    val source  = prototype()
    val present = source.softwares.asScala.map(_.id).toSet
    DB.find(classOf[Software]).findList().asScala.filterNot(sw => present(sw.id)).take(2)
      .foreach(source.softwares.add)
    DB.find(classOf[Language]).where().eq("code", "fi").find
      .filterNot(l => source.examLanguages.asScala.exists(_.code == l.code))
      .foreach(source.examLanguages.add)
    if !source.examOwners.asScala.exists(_.id == t.id) then source.examOwners.add(t)
    source.update()
    val date = new ExaminationDate
    date.exam = source
    date.date = t0.toDate
    date.save()

    val tag = new Tag
    tag.name = "retention-guard"
    tag.creator = t
    tag.save()
    DB.find(classOf[Exam], source.id).examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .map(_.question)
      .foreach { q =>
        val question = DB.find(classOf[Question], q.id)
        question.tags.add(tag)
        if !question.questionOwners.asScala.exists(_.id == t.id) then question.questionOwners.add(t)
        if Option(question.attachment).isEmpty then
          question.attachment = attachment(tempFile("question"))
        question.update()
      }

  private def grant(user: User, permission: Permission): Unit =
    val fresh = DB.find(classOf[User], user.id)
    fresh.permissions.add(permission)
    fresh.update()

  "A retention run" when:
    "one student's data has expired and another student sat the same exam recently" should:
      "remove or change only rows created for the expired student" in:
        setup()
        enrichSharedData()
        val now = t0.plusYears(3)
        // Clears whatever the shared fixture has due at `now`, so the run under test sees only
        // the expired student's data as due
        run(now)

        val recent = now.minusMonths(1)
        val bystander =
          attempt(
            newUser("bystander", recent, Role.Name.STUDENT),
            at = recent,
            lockedAt = Some(recent)
          )
        // A permission row both students link to, so a cascade through the user's permissions
        // would show up as a removed shared row
        val permission = new Permission
        permission.`type` = PermissionType.CAN_INSPECT_LANGUAGE
        permission.save()
        grant(bystander.student, permission)
        val before  = snapshot()
        val expired = attempt(newUser("expired", t0, Role.Name.STUDENT))
        grant(expired.student, permission)
        val withExpired = snapshot()
        val expiredRows = withExpired -- before
        val expiredIds  = expiredRows.flatMap(rowId)

        val report = run(now)
        val after  = snapshot()

        val removed = withExpired -- after
        val added   = after -- withExpired
        removed must not be empty
        withClue("Removed rows that did not belong to the expired student: ") {
          (removed -- expiredRows).map(r => r._1 -> rowId(r)) mustBe empty
        }
        withClue("Rows added or changed outside the expired student's data: ") {
          added.filterNot(r => rowId(r).exists(expiredIds.contains)).map(_._1) mustBe empty
        }
        withClue(report.summary)(report.passes.map(_.failed).sum mustBe 0)

        exists(classOf[User], expired.student.id) mustBe false
        exists(classOf[Permission], permission.id) mustBe true
        DB.find(classOf[User], bystander.student.id).permissions.asScala.map(_.id) mustBe
          List(permission.id)
        Files.exists(expired.answerFile) mustBe false
        Files.exists(bystander.answerFile) mustBe true
        Files.exists(expired.sharedFile) mustBe true
        // The teachers' question attachment files, which the question copies shared
        val questionFiles = DB.find(classOf[Question]).where().isNotNull("attachment").list
          .map(_.attachment.filePath)
          .filter(_.contains("retention-question"))
        questionFiles must not be empty
        questionFiles.foreach(p => withClue(s"$p: ")(Files.exists(Path.of(p)) mustBe true))
