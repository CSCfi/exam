// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.{DB, ExpressionList, FetchConfig}
import models.assessment.{Comment, LanguageInspection}
import models.exam.Exam
import models.exam.ExamState
import models.user.User
import play.api.Logging
import services.mail.EmailComposer

import java.net.URLDecoder
import java.nio.charset.StandardCharsets
import java.time.format.DateTimeFormatter
import java.time.{Instant, ZoneOffset}
import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class LanguageInspectionService @Inject() (
    private val emailComposer: EmailComposer
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def listInspections(
      month: Option[String],
      start: Option[Long],
      end: Option[Long]
  ): List[LanguageInspection] =
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
      .ne("exam.state", ExamState.DELETED)
    applyDateFilters(query, month, start, end).distinct.toList

  def createInspection(
      examId: Long,
      user: User
  ): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[Exam], examId)) match
      case Some(exam) =>
        if Option(exam.languageInspection).isDefined then
          Left(LanguageInspectionError.AlreadySentForInspection)
        else if !exam.subjectToLanguageInspection then
          Left(LanguageInspectionError.NotAllowedForLanguageInspection)
        else
          val inspection = new LanguageInspection
          inspection.exam = exam
          inspection.setCreatorWithDate(user)
          inspection.save()
          Right(inspection)
      case None => Left(LanguageInspectionError.ExamNotFound)

  def assignInspection(id: Long, user: User): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.assignee).isDefined then
          Left(LanguageInspectionError.AlreadyAssigned)
        else
          inspection.setModifierWithDate(user)
          inspection.assignee = user
          inspection.startedAt = new Date()
          inspection.update()
          Right(inspection)
      case None => Left(LanguageInspectionError.InspectionNotFound)

  def setApproval(id: Long, approved: Boolean, user: User): Either[LanguageInspectionError, Unit] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.startedAt).isEmpty then Left(LanguageInspectionError.NotAssigned)
        else if Option(inspection.finishedAt).isDefined then
          Left(LanguageInspectionError.AlreadyFinalized)
        else if Option(
            inspection.statement
          ).isEmpty || inspection.statement.comment.isEmpty
        then
          Left(LanguageInspectionError.NoStatementGiven)
        else
          inspection.finishedAt = new Date
          inspection.approved = approved
          inspection.setModifierWithDate(user)
          inspection.update()

          val recipients = inspection.exam.parent.examOwners.asScala
          emailComposer.scheduleEmail(1.seconds) {
            recipients.foreach(r =>
              emailComposer.composeLanguageInspectionFinishedMessage(r, user, inspection)
              logger.info(s"Language inspection finalization email sent to ${r.email}")
            )
          }
          Right(())
      case None => Left(LanguageInspectionError.InspectionNotFound)

  def setStatement(
      id: Long,
      comment: String,
      user: User
  ): Either[LanguageInspectionError, LanguageInspection] =
    Option(DB.find(classOf[LanguageInspection], id)) match
      case Some(inspection) =>
        if Option(inspection.startedAt).isEmpty then Left(LanguageInspectionError.NotAssigned)
        else if Option(inspection.finishedAt).isDefined then
          Left(LanguageInspectionError.AlreadyFinalized)
        else
          val statement = Option(inspection.statement).getOrElse {
            val newComment = new Comment
            newComment.setCreatorWithDate(user)
            newComment.save()
            inspection.statement = newComment
            inspection.update()
            newComment
          }
          statement.comment = comment
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
          query.ge(
            "finishedAt",
            Instant.ofEpochMilli(s).plus(java.time.Duration.ofDays(1)).truncatedTo(
              java.time.temporal.ChronoUnit.DAYS
            )
          )
        }
        end.fold(withStart) { e =>
          withStart.lt(
            "finishedAt",
            Instant.ofEpochMilli(e).plus(java.time.Duration.ofDays(1)).truncatedTo(
              java.time.temporal.ChronoUnit.DAYS
            )
          )
        }

      // Case 2: Month filter
      case (None, None, Some(monthStr)) =>
        val decoded = URLDecoder.decode(monthStr, StandardCharsets.UTF_8)
        val startOfMonth = Instant.from(DateTimeFormatter.ISO_DATE_TIME.parse(decoded)).atZone(
          ZoneOffset.UTC
        ).toLocalDate.withDayOfMonth(1).atStartOfDay(ZoneOffset.UTC).toInstant
        val endOfMonth = startOfMonth.atZone(ZoneOffset.UTC).toLocalDate.plusMonths(1).atStartOfDay(
          ZoneOffset.UTC
        ).toInstant
        query.between("finishedAt", startOfMonth, endOfMonth)

      // Case 3: No filter
      case _ => query
