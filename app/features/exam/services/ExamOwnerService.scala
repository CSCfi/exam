// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.exam.services

import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import io.ebean.DB
import models.exam.Exam
import models.user.User

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ExamOwnerService @Inject() extends EbeanQueryExtensions with EbeanJsonExtensions:

  def listOwners(examId: Long): Either[ExamOwnerError, List[User]] =
    Option(DB.find(classOf[Exam], examId)) match
      case None       => Left(ExamOwnerError.ExamNotFound)
      case Some(exam) => Right(exam.examOwners.asScala.toList)

  def addOwner(examId: Long, userId: Long, currentUser: User): Either[ExamOwnerError, Unit] =
    (Option(DB.find(classOf[Exam], examId)), Option(DB.find(classOf[User], userId))) match
      case (None, _) => Left(ExamOwnerError.ExamNotFound)
      case (_, None) => Left(ExamOwnerError.UserNotFound)
      case (Some(exam), Some(owner)) =>
        if !currentUser.isAdminOrSupport && !exam.isOwnedOrCreatedBy(currentUser) then
          Left(ExamOwnerError.AccessForbidden)
        else
          exam.examOwners.add(owner)
          exam.update()
          Right(())

  def removeOwner(examId: Long, userId: Long, currentUser: User): Either[ExamOwnerError, Unit] =
    (Option(DB.find(classOf[Exam], examId)), Option(DB.find(classOf[User], userId))) match
      case (None, _) => Left(ExamOwnerError.ExamNotFound)
      case (_, None) => Left(ExamOwnerError.UserNotFound)
      case (Some(exam), Some(owner)) =>
        if !currentUser.isAdminOrSupport && !exam.isOwnedOrCreatedBy(currentUser) then
          Left(ExamOwnerError.AccessForbidden)
        else
          exam.examOwners.remove(owner)
          exam.update()
          Right(())
