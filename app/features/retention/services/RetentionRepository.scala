// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.retention.services

import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.*
import models.attachment.Attachment
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.{Exam, ExamExecutionType, ExamState}
import models.iop.ExternalExam
import models.questions.Question
import models.sections.{ExamSection, ExamSectionQuestion}
import org.joda.time.DateTime
import play.api.Logging
import services.file.FileHandler

import java.util.Date
import javax.inject.Inject
import scala.jdk.CollectionConverters.*
import scala.util.Using

/** A booking the retention job may delete: an enrolment with its reservation, participation and the
  * remains of the student's exam copy.
  */
final case class BookingCandidate(enrolmentId: Long, reservation: Option[Reservation])

/** Candidate queries and deletions for each retention pass. Queries preselect rows in SQL with a
  * generous cut-off and leave the final decision to [[RetentionRules]]. Every deletion runs in a
  * transaction of its own, so a failure leaves only that item untouched.
  */
class RetentionRepository @Inject() (fileHandler: FileHandler)
    extends EbeanQueryExtensions
    with Logging:

  // States in which an unfinished copy still belongs to an ongoing or abandoned exam rather than
  // to an attempt that retention looks after
  private val UnfinishedStates = Set(ExamState.INITIALIZED, ExamState.STUDENT_STARTED)

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
      .fetch("exam", "state, lockedAt, gradedTime")
      .fetch("exam.executionType", "type")
      .fetch("exam.course", "endDate")
      .fetch("exam.parent", "periodEnd")
      .where()
      .isNotNull("exam")

  // Pass A

  /** Unassessed student copies that are due to be locked, by exam id. */
  def autoLockCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    participations
      .in("exam.state", ExamState.REVIEW, ExamState.REVIEW_STARTED, ExamState.GRADED)
      .le("ended", now.minus(policy.autoLock))
      .list
      .filter(p => RetentionRules.isDue(RetentionRules.autoLockAt(attemptFacts(p), policy), now))
      .map(_.exam.id.longValue)

  def autoLock(examId: Long, now: DateTime): Unit =
    val exam = DB.find(classOf[Exam], examId)
    if RetentionRules.UnlockedStates.contains(exam.state) then
      exam.state = ExamState.ARCHIVED
      exam.markLocked(now)
      exam.update()

  // Pass B

  /** Student copies whose content is due to be deleted, by exam id. */
  def attemptCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    // Nothing expires sooner than the shortest attempt period, so it bounds the preselection
    val cutoff = now.minus(RetentionPolicy.AttemptRange._1)
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
      .list
      .filter(p =>
        RetentionRules.isDue(RetentionRules.attemptExpiresAt(attemptFacts(p), policy), now)
      )
      .map(_.exam.id.longValue)

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
    questionCopies.foreach(id => collect(deleteQuestionCopy(id)))

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
    * no cascade can reach the teachers' rows. Returns the question's attachment, if any.
    */
  private def deleteQuestionCopy(questionId: Long): Attachment =
    val inUse =
      DB.find(classOf[ExamSectionQuestion]).where().eq("question.id", questionId).findCount() > 0 ||
        DB.find(classOf[Question]).where().eq("parent.id", questionId).findCount() > 0
    if inUse then null
    else
      val attachment = DB.find(classOf[Question], questionId).attachment
      Seq(
        "DELETE FROM question_owner WHERE question_id = :id",
        "DELETE FROM question_tag WHERE question_id = :id",
        "DELETE FROM multiple_choice_option WHERE question_id = :id",
        "DELETE FROM question WHERE id = :id"
      ).foreach(sql => DB.sqlUpdate(sql).setParameter("id", questionId).execute())
      Option(attachment).foreach(_.delete())
      attachment

  // Attachment copies share the file of their original, so a file goes only once no attachment
  // refers to it any more
  private def removeUnreferencedFiles(paths: List[String]): Unit =
    paths
      .filter(p => DB.find(classOf[Attachment]).where().eq("filePath", p).findCount() == 0)
      .foreach(fileHandler.removeAttachmentFile)

  // Pass C

  def recordCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    DB.find(classOf[ExamRecord])
      .select("timeStamp")
      .where()
      .le("timeStamp", now.minus(policy.record))
      .list
      .filter(r =>
        RetentionRules.isDue(RetentionRules.recordExpiresAt(Option(r.timeStamp), policy), now)
      )
      .map(_.id.longValue)

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

  private def attemptRetained(e: ExamEnrolment): Boolean =
    studentCopy(e).exists { copy =>
      !UnfinishedStates.contains(copy.state) &&
      DB.find(classOf[ExamSection]).where().eq("exam.id", copy.id).findCount() > 0
    }

  def bookingCandidates(policy: RetentionPolicy, now: DateTime): List[BookingCandidate] =
    val cutoff = now.minus(policy.booking)
    DB.find(classOf[ExamEnrolment])
      .fetch("exam", "state")
      .fetch("exam.parent", "id")
      .fetch("collaborativeExam", "id")
      .fetch("reservation")
      .fetch("reservation.externalReservation")
      .fetch("examinationEventConfiguration.examinationEvent", "start")
      .where()
      .isNotNull("user")
      .or()
      .le("reservation.startAt", cutoff)
      .le("examinationEventConfiguration.examinationEvent.start", cutoff)
      .le("enrolledOn", cutoff)
      .endOr()
      .list
      .filter { e =>
        val facts = BookingFacts(
          reservationStart = Option(e.reservation).flatMap(r => Option(r.startAt)),
          examinationEventStart = Option(e.examinationEventConfiguration)
            .flatMap(c => Option(c.examinationEvent))
            .flatMap(ev => Option(ev.start)),
          enrolledOn = Option(e.enrolledOn),
          attemptRetained = attemptRetained(e)
        )
        RetentionRules.isDue(RetentionRules.bookingExpiresAt(facts, policy), now)
      }
      .map(e => BookingCandidate(e.id.longValue, Option(e.reservation)))

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

  def hostReservationCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    DB.find(classOf[Reservation])
      .fetch("enrolment", "id")
      .where()
      .isNotNull("externalUserRef")
      .isNull("user")
      .le("startAt", now.minus(policy.booking))
      .list
      .filter(r => Option(r.enrolment).isEmpty)
      .filter(r =>
        DB.find(classOf[ExamParticipation]).where().eq("reservation.id", r.id).findCount() == 0
      )
      .filter(r =>
        RetentionRules.isDue(
          RetentionRules.hostReservationExpiresAt(Option(r.startAt), policy),
          now
        )
      )
      .map(_.id.longValue)

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
  def hostAttachmentCandidates(): List[(Long, String)] =
    sentHostCopies().flatMap { ee =>
      val ids =
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
      ids.map(ee.id.longValue -> _)
    }

  /** Host-side copies of visiting exam attempts whose content is due to be cleared, by id. */
  def hostCopyCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    sentHostCopies()
      .filter(ee =>
        RetentionRules.isDue(RetentionRules.hostCopyExpiresAt(Option(ee.sent), policy), now)
      )
      .map(_.id.longValue)

  def clearHostCopy(externalExamId: Long): Unit =
    val ee = DB.find(classOf[ExternalExam], externalExamId)
    ee.content = Map.empty[String, Object].asJava
    ee.update()

  private def sentHostCopies(): List[ExternalExam] =
    DB.find(classOf[ExternalExam]).where().isNotNull("sent").jsonExists("content", "id").list

  // Pass E

  def accountCandidates(policy: RetentionPolicy, now: DateTime): List[Long] =
    DB.sqlQuery(
      """SELECT u.id, u.last_login FROM app_user u
        |WHERE u.last_login <= :cutoff
        |AND NOT EXISTS (SELECT 1 FROM exam_enrolment e WHERE e.user_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_participation p WHERE p.user_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM exam_record x WHERE x.student_id = u.id)
        |AND NOT EXISTS (SELECT 1 FROM reservation r WHERE r.user_id = u.id)
        |AND EXISTS (SELECT 1 FROM app_user_role ur JOIN role ro ON ro.id = ur.role_id
        |            WHERE ur.app_user_id = u.id AND ro.name = :student)
        |AND NOT EXISTS (SELECT 1 FROM app_user_role ur JOIN role ro ON ro.id = ur.role_id
        |                WHERE ur.app_user_id = u.id AND ro.name <> :student)""".stripMargin
    )
      .setParameter("cutoff", now.minus(policy.inactivity).toDate)
      .setParameter("student", models.user.Role.Name.STUDENT.toString)
      .findList()
      .asScala
      .toList
      .filter { row =>
        val facts = AccountFacts(
          lastLogin = dt(row.getTimestamp("last_login")),
          studentOnly = true,
          hasRemainingData = false
        )
        RetentionRules.isDue(RetentionRules.accountExpiresAt(facts, policy), now)
      }
      .map(_.getLong("id").longValue)

  /** Deletes a user account. Role and permission links go explicitly, so that no cascade can reach
    * the shared role rows. Any other remaining reference makes the delete fail and roll back.
    */
  def deleteUser(userId: Long): Unit =
    Using.resource(DB.beginTransaction()) { tx =>
      DB.sqlUpdate("DELETE FROM app_user_role WHERE app_user_id = :id").setParameter("id", userId)
        .execute()
      DB.sqlUpdate("DELETE FROM app_user_permission WHERE app_user_id = :id")
        .setParameter("id", userId)
        .execute()
      DB.sqlUpdate("DELETE FROM app_user WHERE id = :id").setParameter("id", userId).execute()
      tx.commit()
    }
