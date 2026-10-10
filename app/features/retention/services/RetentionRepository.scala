// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.annotation.EnumValue
import models.assessment.*
import models.attachment.Attachment
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Exam, ExamExecutionType, ExamState}
import models.iop.ExternalExam
import models.questions.Question
import models.sections.{ExamSection, ExamSectionQuestion}
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import services.file.FileHandler
import services.retention.RetentionLimits

import java.util.Date
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** A booking the retention job may delete: an enrolment with its reservation, participation and the
  * remains of the student's exam copy. `remote` is set when the reservation must also go at XM, and
  * `dueAt` is when its retention ended.
  */
final case class BookingCandidate(enrolmentId: Long, remote: Boolean, dueAt: DateTime)

/** What the retention report says about one item a pass selected. Students appear only by their
  * internal user id.
  */
final case class ReportItem(
    kind: String,
    id: String,
    userId: Option[Long] = None,
    exam: Option[String] = None,
    course: Option[String] = None,
    countsFrom: Option[DateTime] = None,
    dueAt: Option[DateTime] = None,
    detail: String = ""
)

/** An item a pass may act on, with what the report says about it. */
final case class Candidate[A](item: A, report: ReportItem)

/** How far a candidate query goes: it keeps the first `keep` due items and stops counting once
  * `countUpTo` are found.
  */
final case class Limit(keep: Int, countUpTo: Int)

/** The first due items of a pass, and how many are due in all (at most `Limit.countUpTo`). */
final case class Selection[A](items: List[Candidate[A]], due: Int)

/** Candidate queries and deletions for each retention pass. Candidates are read page by page in id
  * order, with only the columns the rules need. Pages follow on from the last id seen rather than
  * an offset, so each costs the same however deep the walk goes. Only the items a run can take are
  * kept, so a large database costs no more memory than a small one. The final decision per row is
  * left to [[RetentionRules]]. Every deletion runs in a transaction of its own, so a failure leaves
  * only that item untouched.
  */
class RetentionRepository @Inject() (fileHandler: FileHandler)
    extends EbeanQueryExtensions
    with Logging:

  // Rows read per candidate query. Overridden in tests to exercise paging
  protected def pageSize: Int = 500

  // States in which an unfinished copy still belongs to an ongoing or abandoned exam rather than
  // to an attempt that retention looks after
  private val UnfinishedStates = Set(ExamState.INITIALIZED, ExamState.STUDENT_STARTED)

  // The value Ebean stores for a state, for use in raw SQL
  private def dbValue(state: ExamState): String =
    classOf[ExamState].getField(state.name).getAnnotation(classOf[EnumValue]).value

  /** Walks candidate rows page by page in id order and counts the due ones, keeping the first
    * `limit.keep` of them and stopping once `limit.countUpTo` are found. `page(afterId, size)`
    * returns up to `size` rows with an id greater than `afterId`, and `id` gives a row's id. Only
    * one page of rows is held in memory at a time.
    */
  private def collectDue[R, A](limit: Limit, rowsPerPage: Int = pageSize)(
      page: (Long, Int) => List[R]
  )(id: R => Long)(due: R => IterableOnce[Candidate[A]]): Selection[A] =
    val found  = List.newBuilder[Candidate[A]]
    var count  = 0
    var after  = 0L
    var isLast = false
    while count < limit.countUpTo && !isLast do
      val rows = page(after, rowsPerPage)
      rows.iterator.flatMap(due).take(limit.countUpTo - count).foreach { c =>
        if count < limit.keep then found += c
        count += 1
      }
      rows.lastOption.foreach(r => after = id(r))
      isLast = rows.size < rowsPerPage
    Selection(found.result(), count)

  private def dt(d: Date): Option[DateTime] = Option(d).map(new DateTime(_))

  private def attemptFacts(p: ExamParticipation): AttemptFacts =
    val exam = p.exam
    AttemptFacts(
      state = exam.state,
      maturity = Option(exam.executionType)
        .exists(_.`type` == ExamExecutionType.Type.MATURITY.toString),
      lockedAt = Option(exam.lockedAt),
      gradedTime = Option(exam.gradedTime),
      ended = Option(p.ended),
      courseEnd = Option(exam.course).flatMap(c => dt(c.endDate)),
      examPeriodEnd = Option(exam.parent).flatMap(e => Option(e.periodEnd))
    )

  private def participations =
    DB.find(classOf[ExamParticipation])
      .select("ended")
      .fetch("user", "id")
      .fetch("exam", "name, state, lockedAt, gradedTime")
      .fetch("exam.executionType", "type")
      .fetch("exam.course", "code, endDate")
      .fetch("exam.parent", "periodEnd")
      .where()
      .isNotNull("exam")

  private def attemptReport(p: ExamParticipation, facts: AttemptFacts, dueAt: Option[DateTime]) =
    ReportItem(
      kind = "exam copy",
      id = p.exam.id.toString,
      userId = Option(p.user).map(_.id.longValue),
      exam = Option(p.exam.name),
      course = Option(p.exam.course).flatMap(c => Option(c.code)),
      countsFrom = RetentionRules.attemptCountsFrom(facts),
      dueAt = dueAt,
      detail = s"state ${facts.state}" + (if facts.maturity then ", maturity exam" else "")
    )

  // Pass A

  /** Unassessed student copies that are due to be locked, by exam id. */
  def autoLockCandidates(
      policy: RetentionPolicy,
      now: DateTime,
      limit: Limit
  ): Selection[Long] =
    collectDue(limit)((after, size) =>
      participations
        .in("exam.state", ExamState.REVIEW, ExamState.REVIEW_STARTED, ExamState.GRADED)
        .le("ended", now.minus(policy.autoLock))
        .gt("id", after)
        .orderBy("id")
        .setMaxRows(size)
        .list
    )(_.id.longValue) { p =>
      val facts = attemptFacts(p)
      val dueAt = RetentionRules.autoLockAt(facts, policy)
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(p.exam.id.longValue, attemptReport(p, facts, dueAt))
      )
    }

  def autoLock(examId: Long, now: DateTime): Unit =
    val exam = DB.find(classOf[Exam], examId)
    if RetentionRules.UnlockedStates.contains(exam.state) then
      exam.state = ExamState.ARCHIVED
      exam.markLocked(now)
      exam.update()

  // Pass B

  /** Student copies whose content is due to be deleted, by exam id. */
  def attemptCandidates(policy: RetentionPolicy, now: DateTime, limit: Limit): Selection[Long] =
    // Nothing expires sooner than the shortest attempt period, so it bounds the preselection
    val cutoff = now.minus(RetentionLimits.AttemptRange._1)
    collectDue(limit)((after, size) =>
      participations
        .or()
        .in("exam.state", ExamState.GRADED_LOGGED, ExamState.ARCHIVED, ExamState.REJECTED)
        .eq("exam.state", ExamState.ABORTED)
        .and()
        .eq("exam.state", ExamState.DELETED)
        .isNotEmpty("exam.examSections")
        .endAnd()
        .endOr()
        .or()
        .le("exam.lockedAt", cutoff)
        .le("exam.gradedTime", cutoff)
        .le("ended", cutoff)
        .endOr()
        .gt("id", after)
        .orderBy("id")
        .setMaxRows(size)
        .list
    )(_.id.longValue) { p =>
      val facts = attemptFacts(p)
      val dueAt = RetentionRules.attemptExpiresAt(facts, policy)
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(p.exam.id.longValue, attemptReport(p, facts, dueAt))
      )
    }

  /** Deletes the content of a student's exam copy and marks it deleted. The bare copy stays until
    * its booking expires, because statistics and attempt counting read the enrolment's exam.
    */
  def stripAttempt(examId: Long): Unit =
    val filePaths = Using.resource(DB.beginTransaction()) { tx =>
      val paths = stripContent(examId)
      val exam  = DB.find(classOf[Exam], examId)
      exam.creator = null
      exam.state = ExamState.DELETED
      exam.update()
      tx.commit()
      paths
    }
    removeUnreferencedFiles(filePaths)

  /** Deletes everything the student's exam copy holds apart from the exam row itself, within the
    * caller's transaction. Returns the file paths of the deleted attachments.
    */
  private def stripContent(examId: Long): List[String] =
    val paths = List.newBuilder[String]
    def collect(a: Attachment): Unit =
      Option(a).flatMap(a => Option(a.filePath)).foreach(paths += _)

    DB.find(classOf[LanguageInspection]).where().eq("exam.id", examId).list.foreach { li =>
      val statement = li.statement
      li.delete()
      Option(statement).foreach { c =>
        collect(c.attachment); c.delete()
      }
    }
    DB.find(classOf[ExamInspection]).where().eq("exam.id", examId).list.foreach { ei =>
      val comment = ei.comment
      ei.delete()
      Option(comment).foreach { c =>
        collect(c.attachment); c.delete()
      }
    }
    DB.find(classOf[InspectionComment]).where().eq("exam.id", examId).list.foreach(_.delete())
    val sections = DB.find(classOf[ExamSection])
      .fetch("sectionQuestions.essayAnswer.attachment")
      .fetch("sectionQuestions.question", "id")
      .fetch("sectionQuestions.question.parent", "id")
      .where()
      .eq("exam.id", examId)
      .list
    val sectionQuestions = sections.flatMap(_.sectionQuestions.asScala)
    sectionQuestions.flatMap(q => Option(q.essayAnswer)).foreach(a => collect(a.attachment))
    // Student copies get their own copy of each question, linked to the original as its parent
    val questionCopies = sectionQuestions
      .flatMap(q => Option(q.question))
      .filter(q => Option(q.parent).isDefined)
      .map(_.id.longValue)
      .distinct
    sections.foreach(_.delete())
    questionCopies.flatMap(deleteQuestionCopy).foreach(paths += _)

    val exam       = DB.find(classOf[Exam], examId)
    val feedback   = exam.examFeedback
    val attachment = exam.attachment
    if Option(feedback).isDefined || Option(attachment).isDefined then
      exam.examFeedback = null
      exam.attachment = null
      exam.update()
    Option(feedback).foreach { c =>
      collect(c.attachment); c.delete()
    }
    Option(attachment).foreach { a =>
      collect(a); a.delete()
    }
    paths.result().distinct

  /** Deletes a question copied for a student exam, unless something else still uses it. Its owner
    * and tag links are shared with the original question's owners and tags, so they go by SQL and
    * no cascade can reach the teachers' rows. Returns the file of the question's attachment, if
    * any.
    */
  private def deleteQuestionCopy(questionId: Long): Option[String] =
    val inUse =
      DB.find(classOf[ExamSectionQuestion]).where().eq("question.id", questionId).findCount() > 0 ||
        DB.find(classOf[Question]).where().eq("parent.id", questionId).findCount() > 0
    if inUse then None
    else
      val attachment = Option(DB.find(classOf[Question], questionId).attachment)
      // Read before deletion, so the row can no longer be loaded afterward
      val filePath = attachment.flatMap(a => Option(a.filePath))
      Seq(
        "DELETE FROM question_owner WHERE question_id = :id",
        "DELETE FROM question_tag WHERE question_id = :id",
        "DELETE FROM multiple_choice_option WHERE question_id = :id",
        "DELETE FROM question WHERE id = :id"
      ).foreach(sql => DB.sqlUpdate(sql).setParameter("id", questionId).execute())
      attachment.foreach(_.delete())
      filePath

  // Attachment copies share the file of their original, so a file goes only once no attachment
  // refers to it anymore
  private def removeUnreferencedFiles(paths: List[String]): Unit =
    paths
      .filter(p => DB.find(classOf[Attachment]).where().eq("filePath", p).findCount() == 0)
      .foreach(fileHandler.removeAttachmentFile)

  // Pass C

  def recordCandidates(policy: RetentionPolicy, now: DateTime, limit: Limit): Selection[Long] =
    collectDue(limit)((after, size) =>
      DB.find(classOf[ExamRecord])
        .select("timeStamp")
        .fetch("student", "id")
        .fetch("exam", "name")
        .fetch("examScore", "courseUnitCode")
        .where()
        .le("timeStamp", now.minus(policy.record))
        .gt("id", after)
        .orderBy("id")
        .setMaxRows(size)
        .list
    )(_.id.longValue) { r =>
      val dueAt = RetentionRules.recordExpiresAt(Option(r.timeStamp), policy)
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(
          r.id.longValue,
          ReportItem(
            kind = "grading record",
            id = r.id.toString,
            userId = Option(r.student).map(_.id.longValue),
            exam = Option(r.exam).flatMap(e => Option(e.name)),
            course = Option(r.examScore).flatMap(s => Option(s.courseUnitCode)),
            countsFrom = Option(r.timeStamp),
            dueAt = dueAt
          )
        )
      )
    }

  def deleteRecord(recordId: Long): Unit =
    Using.resource(DB.beginTransaction()) { tx =>
      val record = DB.find(classOf[ExamRecord], recordId)
      val score  = record.examScore
      // exam_record references exam_score, so the record goes first
      record.delete()
      Option(score).foreach(_.delete())
      tx.commit()
    }

  // Pass D

  private def studentCopy(e: ExamEnrolment): Option[Exam] =
    Option(e.exam).filter(x => Option(x.parent).isDefined || Option(e.collaborativeExam).isDefined)

  /** Enrolments whose booking is due to be deleted. An enrolment whose student copy still holds an
    * attempt that retention looks after is left out in SQL: the copy has sections and is past the
    * unfinished states.
    */
  def bookingCandidates(
      policy: RetentionPolicy,
      now: DateTime,
      limit: Limit
  ): Selection[BookingCandidate] =
    val sql =
      s"""SELECT e.id, e.user_id, e.enrolled_on, r.id AS reservation_id, r.start_at,
         |       ev.start AS event_start, x.name AS exam_name, co.code AS course_code,
         |       (r.external_ref IS NOT NULL AND r.external_reservation_id IS NOT NULL) AS remote
         |FROM exam_enrolment e
         |LEFT JOIN reservation r ON r.id = e.reservation_id
         |LEFT JOIN examination_event_configuration c ON c.id = e.examination_event_configuration_id
         |LEFT JOIN examination_event ev ON ev.id = c.examination_event_id
         |LEFT JOIN exam x ON x.id = e.exam_id
         |LEFT JOIN course co ON co.id = x.course_id
         |WHERE e.user_id IS NOT NULL
         |AND (r.start_at <= :cutoff OR ev.start <= :cutoff OR e.enrolled_on <= :cutoff)
         |AND NOT (x.id IS NOT NULL
         |         AND (x.parent_id IS NOT NULL OR e.collaborative_exam_id IS NOT NULL)
         |         AND x.state NOT IN (${UnfinishedStates.map(dbValue).mkString(", ")})
         |         AND EXISTS (SELECT 1 FROM exam_section s WHERE s.exam_id = x.id))
         |AND e.id > :after
         |ORDER BY e.id""".stripMargin
    collectDue(limit)((after, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.booking).toDate)
        .setParameter("after", after)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    )(_.getLong("id").longValue) { row =>
      val facts = BookingFacts(
        reservationStart = dt(row.getTimestamp("start_at")),
        examinationEventStart = dt(row.getTimestamp("event_start")),
        enrolledOn = dt(row.getTimestamp("enrolled_on")),
        attemptRetained = false
      )
      val remote        = row.getBoolean("remote")
      val reservationId = Option(row.getLong("reservation_id"))
      RetentionRules
        .bookingExpiresAt(facts, policy)
        .filter(at => RetentionRules.isDue(Some(at), now))
        .map { at =>
          val id = row.getLong("id").longValue
          Candidate(
            BookingCandidate(id, remote, at),
            ReportItem(
              kind = "enrolment",
              id = id.toString,
              userId = Option(row.getLong("user_id")).map(_.longValue),
              exam = Option(row.getString("exam_name")),
              course = Option(row.getString("course_code")),
              countsFrom = RetentionRules.bookingCountsFrom(facts),
              dueAt = Some(at),
              detail = reservationId.fold("no reservation")(r => s"reservation $r") +
                (if remote then ", visiting reservation, deleted at XM first" else "")
            )
          )
        }
    }

  /** The reservation of an enrolment, with the external data XM needs to find it. */
  def reservationOf(enrolmentId: Long): Option[Reservation] =
    DB.find(classOf[ExamEnrolment])
      .fetch("reservation")
      .fetch("reservation.externalReservation")
      .where()
      .idEq(enrolmentId)
      .find
      .flatMap(e => Option(e.reservation))

  /** Deletes an enrolment with its participation, reservation and the bare exam copy. */
  def deleteBooking(enrolmentId: Long): Unit =
    val filePaths = Using.resource(DB.beginTransaction()) { tx =>
      val enrolment   = DB.find(classOf[ExamEnrolment], enrolmentId)
      val copy        = studentCopy(enrolment)
      val reservation = Option(enrolment.reservation)
      val participations =
        DB.find(classOf[ExamParticipation]).where().or()
          .in("exam.id", copy.map(_.id).toList.asJava)
          .in("reservation.id", reservation.map(_.id).toList.asJava)
          .endOr()
          .list
      // Participation and enrolment share the reservation and both cascade its removal, so only
      // the enrolment keeps the link
      participations.foreach { p =>
        p.reservation = null
        p.exam = null
        p.update()
        p.delete()
      }
      copy.foreach { c =>
        DB.find(classOf[ExamRecord]).where().eq("exam.id", c.id).list.foreach { r =>
          r.exam = null
          r.update()
        }
      }
      // A copy that was never stripped, such as an abandoned one, still has content
      val paths = copy.toList.flatMap(c => stripContent(c.id))
      enrolment.exam = null
      enrolment.update()
      enrolment.delete()
      copy.foreach(c => DB.find(classOf[Exam], c.id).delete())
      tx.commit()
      paths
    }
    removeUnreferencedFiles(filePaths)

  // Pass D′

  def hostReservationCandidates(
      policy: RetentionPolicy,
      now: DateTime,
      limit: Limit
  ): Selection[Long] =
    val sql =
      """SELECT r.id, r.start_at, r.external_org_ref FROM reservation r
        |WHERE r.external_user_ref IS NOT NULL AND r.user_id IS NULL AND r.start_at <= :cutoff
        |AND NOT EXISTS (SELECT 1 FROM exam_enrolment e WHERE e.reservation_id = r.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_participation p WHERE p.reservation_id = r.id)
        |AND r.id > :after
        |ORDER BY r.id""".stripMargin
    collectDue(limit)((after, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.booking).toDate)
        .setParameter("after", after)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    )(_.getLong("id").longValue) { row =>
      val start = dt(row.getTimestamp("start_at"))
      val dueAt = RetentionRules.hostReservationExpiresAt(start, policy)
      val id    = row.getLong("id").longValue
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(
          id,
          ReportItem(
            kind = "host-side visitor reservation",
            id = id.toString,
            countsFrom = start,
            dueAt = dueAt,
            detail = Option(row.getString("external_org_ref")).fold("")(o => s"visitor from $o")
          )
        )
      )
    }

  def deleteHostReservation(reservationId: Long): Unit =
    Using.resource(DB.beginTransaction()) { tx =>
      DB.find(classOf[Reservation], reservationId).delete()
      tx.commit()
    }

  // Pass H

  /** Answer attachments that host-side copies of visiting exam attempts still hold at XM, as
    * (external exam id, attachment id at XM). The copy is sent home at the end of the attempt, and
    * each run removes what XM still has, as ExternalExamExpirationService has done.
    */
  def hostAttachmentCandidates(limit: Limit): Selection[(Long, String)] =
    // Each row carries a whole exam as JSON, so the pages are small
    collectDue(limit, rowsPerPage = math.min(pageSize, 50))((after, size) =>
      sentHostCopies.gt("id", after).orderBy("id").setMaxRows(size).list
    )(_.id.longValue) { ee =>
      attachmentIds(ee).map(attachmentId =>
        Candidate(
          ee.id.longValue -> attachmentId,
          ReportItem(kind = "attachment at XM", id = attachmentId, detail = s"host copy ${ee.id}")
        )
      )
    }

  private def attachmentIds(ee: ExternalExam): List[String] =
    try
      ee.deserialize.examSections.asScala.toList
        .flatMap(_.sectionQuestions.asScala)
        .flatMap(q => Option(q.essayAnswer))
        .flatMap(a => Option(a.attachment))
        .flatMap(a => Option(a.externalId))
    catch
      case e: Exception =>
        logger.error(s"Failed to deserialize external exam ${ee.id}", e)
        Nil

  /** Host-side copies of visiting exam attempts whose content is due to be cleared, by id. */
  def hostCopyCandidates(
      policy: RetentionPolicy,
      now: DateTime,
      limit: Limit
  ): Selection[Long] =
    collectDue(limit)((after, size) =>
      DB.find(classOf[ExternalExam])
        .select("sent")
        .where()
        .le("sent", now.minus(policy.hostCopy))
        .jsonExists("content", "id")
        .gt("id", after)
        .orderBy("id")
        .setMaxRows(size)
        .list
    )(_.id.longValue) { ee =>
      val dueAt = RetentionRules.hostCopyExpiresAt(Option(ee.sent), policy)
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(
          ee.id.longValue,
          ReportItem(
            kind = "host copy of visiting attempt",
            id = ee.id.toString,
            countsFrom = Option(ee.sent),
            dueAt = dueAt
          )
        )
      )
    }

  def clearHostCopy(externalExamId: Long): Unit =
    val ee = DB.find(classOf[ExternalExam], externalExamId)
    ee.content = Map.empty[String, Object].asJava
    ee.update()

  private def sentHostCopies =
    DB.find(classOf[ExternalExam]).where().isNotNull("sent").jsonExists("content", "id")

  // Pass E

  def accountCandidates(policy: RetentionPolicy, now: DateTime, limit: Limit): Selection[Long] =
    val sql =
      """SELECT u.id, u.last_login FROM app_user u
        |WHERE u.last_login <= :cutoff
        |AND NOT EXISTS (SELECT 1 FROM exam_enrolment e WHERE e.user_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_participation p WHERE p.user_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_record x WHERE x.student_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM reservation r WHERE r.user_id = u.id)
        |AND EXISTS (SELECT 1 FROM app_user_role ur JOIN role ro ON ro.id = ur.role_id
        |            WHERE ur.app_user_id = u.id AND ro.name = :student)
        |AND NOT EXISTS (SELECT 1 FROM app_user_role ur JOIN role ro ON ro.id = ur.role_id
        |                WHERE ur.app_user_id = u.id AND ro.name <> :student)
        |AND u.id > :after
        |ORDER BY u.id""".stripMargin
    collectDue(limit)((after, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.inactivity).toDate)
        .setParameter("student", models.user.Role.Name.STUDENT.toString)
        .setParameter("after", after)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    )(_.getLong("id").longValue) { row =>
      val facts = AccountFacts(
        lastLogin = dt(row.getTimestamp("last_login")),
        studentOnly = true,
        hasRemainingData = false
      )
      val dueAt = RetentionRules.accountExpiresAt(facts, policy)
      val id    = row.getLong("id").longValue
      Option.when(RetentionRules.isDue(dueAt, now))(
        Candidate(
          id,
          ReportItem(
            kind = "user account",
            id = id.toString,
            userId = Some(id),
            countsFrom = facts.lastLogin,
            dueAt = dueAt,
            detail = "student role only, no other student data left"
          )
        )
      )
    }

  /** Deletes a user account.
    */
  def deleteUser(userId: Long): Unit =
    Using.resource(DB.beginTransaction()) { tx =>
      DB.delete(classOf[User], userId)
      tx.commit()
    }
