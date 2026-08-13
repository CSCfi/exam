// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.assessment.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.assessment.{Comment, ExamInspection}
import models.exam.Exam
import models.exam.ExamState
import models.user.User
import services.mail.EmailComposer

import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*

class ExamInspectionService @Inject() (
    private val emailComposer: EmailComposer
) extends EbeanQueryExtensions
    with EbeanJsonExtensions:

  def findUser(uid: Long): Either[ExamInspectionError, User] =
    Option(DB.find(classOf[User], uid)) match
      case Some(user) => Right(user)
      case None       => Left(ExamInspectionError.UserNotFound)

  def findExam(eid: Long): Either[ExamInspectionError, Exam] =
    Option(DB.find(classOf[Exam], eid)) match
      case Some(exam) => Right(exam)
      case None       => Left(ExamInspectionError.ExamNotFound)

  def isInspectorOf(user: User, exam: Exam): Boolean =
    exam.examInspections.asScala.exists(_.user == user)

  def addInspection(
      exam: Exam,
      recipient: User,
      assignedBy: User,
      commentText: Option[String]
  ): ExamInspection =
    val inspection = new ExamInspection
    inspection.exam = exam
    inspection.user = recipient
    inspection.assignedBy = assignedBy

    commentText match
      case Some(text) =>
        val c = new Comment
        c.setCreatorWithDate(assignedBy)
        c.comment = text
        inspection.comment = c
        c.save()
        emailComposer.scheduleEmail(1.seconds) {
          emailComposer.composeExamReviewRequest(recipient, assignedBy, exam, text)
        }
      case None => ()

    inspection.save()

    // Add also as inspector to ongoing child exams if not already there.
    exam.children.asScala
      .filter(e =>
        e.hasState(ExamState.REVIEW, ExamState.STUDENT_STARTED, ExamState.REVIEW_STARTED)
          && !isInspectorOf(recipient, e)
      )
      .foreach(e =>
        val i = new ExamInspection
        i.exam = e
        i.user = recipient
        i.assignedBy = assignedBy
        i.save()
      )

    inspection

  def setOutcome(id: Long, ready: Boolean): Either[ExamInspectionError, ExamInspection] =
    Option(DB.find(classOf[ExamInspection], id)) match
      case Some(inspection) =>
        inspection.ready = ready
        inspection.update()
        Right(inspection)
      case None => Left(ExamInspectionError.InspectionNotFound)

  def listInspections(examId: Long): List[ExamInspection] =
    DB
      .find(classOf[ExamInspection])
      .fetch("user", "id, email, firstName, lastName")
      .where()
      .eq("exam.id", examId)
      .distinct
      .toList

  def deleteInspection(id: Long): Either[ExamInspectionError, Unit] =
    Option(DB.find(classOf[ExamInspection], id)) match
      case Some(inspection) =>
        inspection.exam.children.asScala
          .filter(c =>
            c.hasState(ExamState.REVIEW, ExamState.STUDENT_STARTED, ExamState.REVIEW_STARTED)
          )
          .foreach(c =>
            c.examInspections.asScala
              .filter(ei => ei.user.equals(inspection.user))
              .foreach(_.delete)
          )
        inspection.delete()
        Right(())
      case None => Left(ExamInspectionError.InspectionNotFound)
