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

/** Candidate queries and deletions for each retention pass. Candidates are read page by page in id
  * order, with only the columns the rules need, and each query stops as soon as `limit` due items
  * are found, so a large database costs no more memory than a small one. The final decision per row
  * is left to [[RetentionRules]]. Every deletion runs in a transaction of its own, so a failure
  * leaves only that item untouched.
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

  /** Walks candidate rows page by page and keeps the due ones, stopping once `limit` are found.
    * Only one page of rows is held in memory at a time.
    */
  private def collectDue[R, A](limit: Int, rowsPerPage: Int = pageSize)(
      page: (Int, Int) => List[R]
  )(due: R => Option[A]): List[A] =
    val found = List.newBuilder[A]
    var count = 0
    val pages = inPages(rowsPerPage)(page).iterator
    while count < limit && pages.hasNext do
      pages.next().iterator.flatMap(due).take(limit - count).foreach { a =>
        found += a
        count += 1
      }
    found.result()

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
      .fetch("exam", "state, lockedAt, gradedTime")
      .fetch("exam.executionType", "type")
      .fetch("exam.course", "endDate")
      .fetch("exam.parent", "periodEnd")
      .where()
      .isNotNull("exam")

  // Pass A

  /** Unassessed student copies that are due to be locked, by exam id. */
  def autoLockCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
    collectDue(limit)((offset, size) =>
      participations
        .in("exam.state", ExamState.REVIEW, ExamState.REVIEW_STARTED, ExamState.GRADED)
        .le("ended", now.minus(policy.autoLock))
        .orderBy("id")
        .setFirstRow(offset)
        .setMaxRows(size)
        .list
    )(p =>
      Option.when(RetentionRules.isDue(RetentionRules.autoLockAt(attemptFacts(p), policy), now))(
        p.exam.id.longValue
      )
    )

  def autoLock(examId: Long, now: DateTime): Unit =
    val exam = DB.find(classOf[Exam], examId)
    if RetentionRules.UnlockedStates.contains(exam.state) then
      exam.state = ExamState.ARCHIVED
      exam.markLocked(now)
      exam.update()

  // Pass B

  /** Student copies whose content is due to be deleted, by exam id. */
  def attemptCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
    // Nothing expires sooner than the shortest attempt period, so it bounds the preselection
    val cutoff = now.minus(RetentionLimits.AttemptRange._1)
    collectDue(limit)((offset, size) =>
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
        .orderBy("id")
        .setFirstRow(offset)
        .setMaxRows(size)
        .list
    )(p =>
      Option.when(
        RetentionRules.isDue(RetentionRules.attemptExpiresAt(attemptFacts(p), policy), now)
      )(p.exam.id.longValue)
    )

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

  def recordCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
    collectDue(limit)((offset, size) =>
      DB.find(classOf[ExamRecord])
        .select("timeStamp")
        .where()
        .le("timeStamp", now.minus(policy.record))
        .orderBy("id")
        .setFirstRow(offset)
        .setMaxRows(size)
        .list
    )(r =>
      Option.when(
        RetentionRules.isDue(RetentionRules.recordExpiresAt(Option(r.timeStamp), policy), now)
      )(r.id.longValue)
    )

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
      limit: Int
  ): List[BookingCandidate] =
    val sql =
      s"""SELECT e.id, e.enrolled_on, r.start_at, ev.start AS event_start,
         |       (r.external_ref IS NOT NULL AND r.external_reservation_id IS NOT NULL) AS remote
         |FROM exam_enrolment e
         |LEFT JOIN reservation r ON r.id = e.reservation_id
         |LEFT JOIN examination_event_configuration c ON c.id = e.examination_event_configuration_id
         |LEFT JOIN examination_event ev ON ev.id = c.examination_event_id
         |LEFT JOIN exam x ON x.id = e.exam_id
         |WHERE e.user_id IS NOT NULL
         |AND (r.start_at <= :cutoff OR ev.start <= :cutoff OR e.enrolled_on <= :cutoff)
         |AND NOT (x.id IS NOT NULL
         |         AND (x.parent_id IS NOT NULL OR e.collaborative_exam_id IS NOT NULL)
         |         AND x.state NOT IN (${UnfinishedStates.map(dbValue).mkString(", ")})
         |         AND EXISTS (SELECT 1 FROM exam_section s WHERE s.exam_id = x.id))
         |ORDER BY e.id""".stripMargin
    collectDue(limit)((offset, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.booking).toDate)
        .setFirstRow(offset)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    ) { row =>
      val facts = BookingFacts(
        reservationStart = dt(row.getTimestamp("start_at")),
        examinationEventStart = dt(row.getTimestamp("event_start")),
        enrolledOn = dt(row.getTimestamp("enrolled_on")),
        attemptRetained = false
      )
      RetentionRules
        .bookingExpiresAt(facts, policy)
        .filter(at => RetentionRules.isDue(Some(at), now))
        .map(at => BookingCandidate(row.getLong("id").longValue, row.getBoolean("remote"), at))
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

  def hostReservationCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
    val sql =
      """SELECT r.id, r.start_at FROM reservation r
        |WHERE r.external_user_ref IS NOT NULL AND r.user_id IS NULL AND r.start_at <= :cutoff
        |AND NOT EXISTS (SELECT 1 FROM exam_enrolment e WHERE e.reservation_id = r.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_participation p WHERE p.reservation_id = r.id)
        |ORDER BY r.id""".stripMargin
    collectDue(limit)((offset, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.booking).toDate)
        .setFirstRow(offset)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    )(row =>
      Option.when(
        RetentionRules.isDue(
          RetentionRules.hostReservationExpiresAt(dt(row.getTimestamp("start_at")), policy),
          now
        )
      )(row.getLong("id").longValue)
    )

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
  def hostAttachmentCandidates(limit: Int): List[(Long, String)] =
    // Each row carries a whole exam as JSON, so the pages are small
    collectDue(limit, rowsPerPage = math.min(pageSize, 50))((offset, size) =>
      sentHostCopies.orderBy("id").setFirstRow(offset).setMaxRows(size).list
    )(ee => Option(attachmentIds(ee).map(ee.id.longValue -> _)).filter(_.nonEmpty))
      .flatten
      .take(limit)

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
  def hostCopyCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
    collectDue(limit)((offset, size) =>
      DB.find(classOf[ExternalExam])
        .select("sent")
        .where()
        .le("sent", now.minus(policy.hostCopy))
        .jsonExists("content", "id")
        .orderBy("id")
        .setFirstRow(offset)
        .setMaxRows(size)
        .list
    )(ee =>
      Option.when(
        RetentionRules.isDue(RetentionRules.hostCopyExpiresAt(Option(ee.sent), policy), now)
      )(ee.id.longValue)
    )

  def clearHostCopy(externalExamId: Long): Unit =
    val ee = DB.find(classOf[ExternalExam], externalExamId)
    ee.content = Map.empty[String, Object].asJava
    ee.update()

  private def sentHostCopies =
    DB.find(classOf[ExternalExam]).where().isNotNull("sent").jsonExists("content", "id")

  // Pass E

  def accountCandidates(policy: RetentionPolicy, now: DateTime, limit: Int): List[Long] =
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
        |ORDER BY u.id""".stripMargin
    collectDue(limit)((offset, size) =>
      DB.sqlQuery(sql)
        .setParameter("cutoff", now.minus(policy.inactivity).toDate)
        .setParameter("student", models.user.Role.Name.STUDENT.toString)
        .setFirstRow(offset)
        .setMaxRows(size)
        .findList()
        .asScala
        .toList
    ) { row =>
      val facts = AccountFacts(
        lastLogin = dt(row.getTimestamp("last_login")),
        studentOnly = true,
        hasRemainingData = false
      )
      Option.when(RetentionRules.isDue(RetentionRules.accountExpiresAt(facts, policy), now))(
        row.getLong("id").longValue
      )
    }

  /** Deletes a user account.
    */
  def deleteUser(userId: Long): Unit =
    Using.resource(DB.beginTransaction()) { tx =>
      DB.delete(classOf[User], userId)
      tx.commit()
    }
