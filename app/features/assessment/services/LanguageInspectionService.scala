// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import io.ebean.{DB, ExpressionList, FetchConfig}
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.assessment.{Comment, LanguageInspection}
import models.exam.Exam
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import services.mail.EmailComposer

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration._
import scala.jdk.CollectionConverters._

class LanguageInspectionService @Inject() (
    private val emailComposer: EmailComposer
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def listInspections(month: Option[String], start: Option[Long], end: Option[Long]): List[LanguageInspection] =
    val query = DB
      .find(classOf[LanguageInspection])
      .fetch("exam")
      .fetch("exam.course")
      .fetch("exam.creator", "firstName, lastName, email, userIdentifier")
      .fetch("exam.parent.examOwners", "firstName, lastName, email, userIdentifier")
      .fetch("exam.examLanguages", FetchConfig.ofQuery)
      .fetch("statement")
      .fetch("creator", "firstName, lastName, email, userIdentifier")
      .fetch("assignee", "firstName, lastName, email, userIdentifier")
      .where
      .ne("exam.state", Exam.State.DELETED)
    applyDateFilters(query, month, start, end).distinct.toList

  def createInspection(examId: Long, user: User): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        if Option(exam.getLanguageInspection).isDefined then Left(LanguageInspectionError.AlreadySentForInspection)
        else if !exam.getSubjectToLanguageInspection then Left(LanguageInspectionError.NotAllowedForLanguageInspection)
        else
          val inspection = new LanguageInspection
          inspection.setExam(exam)
          inspection.setCreatorWithDate(user)
          inspection.save()
          Right(inspection)
      case None => Left(LanguageInspectionError.ExamNotFound)

  def assignInspection(id: Long, user: User): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.getAssignee).isDefined then Left(LanguageInspectionError.AlreadyAssigned)
        else
          inspection.setModifierWithDate(user)
          inspection.setAssignee(user)
          inspection.setStartedAt(new Date())
          inspection.update()
          Right(inspection)
      case None => Left(LanguageInspectionError.InspectionNotFound)

  def setApproval(id: Long, approved: Boolean, user: User): Either[LanguageInspectionError, Unit] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.getStartedAt).isEmpty then Left(LanguageInspectionError.NotAssigned)
        else if Option(inspection.getFinishedAt).isDefined then Left(LanguageInspectionError.AlreadyFinalized)
        else if Option(inspection.getStatement).isEmpty || inspection.getStatement.getComment.isEmpty then
          Left(LanguageInspectionError.NoStatementGiven)
        else
          inspection.setFinishedAt(new Date)
          inspection.setApproved(approved)
          inspection.setModifierWithDate(user)
          inspection.update()

          val recipients = inspection.getExam.getParent.getExamOwners.asScala
          emailComposer.scheduleEmail(1.seconds) {
            recipients.foreach(r =>
              emailComposer.composeLanguageInspectionFinishedMessage(r, user, inspection)
              logger.info(s"Language inspection finalization email sent to ${r.getEmail}")
            )
          }
          Right(())
      case None => Left(LanguageInspectionError.InspectionNotFound)

  def setStatement(id: Long, comment: String, user: User): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.getStartedAt).isEmpty then Left(LanguageInspectionError.NotAssigned)
        else if Option(inspection.getFinishedAt).isDefined then Left(LanguageInspectionError.AlreadyFinalized)
        else
          val statement = Option(inspection.getStatement).getOrElse {
            val newComment = new Comment
            newComment.setCreatorWithDate(user)
            newComment.save()
            inspection.setStatement(newComment)
            inspection.update()
            newComment
          }
          statement.setComment(comment)
          statement.setModifierWithDate(user)
          statement.update()
          inspection.setModifierWithDate(user)
          inspection.update()
          Right(inspection)
      case None => Left(LanguageInspectionError.InspectionNotFound)

  private def applyDateFilters(
      query: ExpressionList[LanguageInspection],
      month: Option[String],
      start: Option[Long],
      end: Option[Long]
  ): ExpressionList[LanguageInspection] =
    (start, end, month) match
      // Case 1: Range filter (start and/or end)
      case (Some(_), _, _) | (_, Some(_), _) =>
        val withStart = start.fold(query) { s =>
          val startDate = new DateTime(s).plusDays(1).withTimeAtStartOfDay()
          query.ge("finishedAt", startDate.toDate)
        }
        end.fold(withStart) { e =>
          val endDate = new DateTime(e).plusDays(1).withTimeAtStartOfDay()
          withStart.lt("finishedAt", endDate.toDate)
        }

      // Case 2: Month filter
      case (None, None, Some(monthStr)) =>
        val decoded      = URLDecoder.decode(monthStr, StandardCharsets.UTF_8)
        val startOfMonth = DateTime.parse(decoded).withMillisOfDay(0)
        val endOfMonth   = startOfMonth.plusMonths(1)
        query.between("finishedAt", startOfMonth.toDate, endOfMonth.toDate)

      // Case 3: No filter
      case _ => query
