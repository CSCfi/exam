// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam.copy

import models.user.User

import scala.jdk.CollectionConverters.*

/** Configuration for exam copying operations.
  */
enum CopyType:
  /** Copy for teacher/admin (prototype copy) */
  case TEACHER_COPY

  /** Copy for student exam participation */
  case STUDENT_EXAM

  /** Copy for collaborative exam */
  case COLLABORATIVE_EXAM

  /** Copy with student answers (for assessment/review) */
  case WITH_ANSWERS

final class ExamCopyContext private (
    val user: Option[User],
    val copyType: CopyType,
    val selectedSections: Set[Long]
):
  // Java interop methods
  def getUser: User                                      = user.orNull
  def getCopyType: CopyType                              = copyType
  def getSelectedSections: java.util.Set[java.lang.Long] = selectedSections.map(java.lang.Long.valueOf).asJava

  def isStudentExam: Boolean =
    copyType == CopyType.STUDENT_EXAM || copyType == CopyType.COLLABORATIVE_EXAM

  def isWithAnswers: Boolean = copyType == CopyType.WITH_ANSWERS

  def shouldSetParent: Boolean =
    // Teacher copies and non-collaborative student exams should have parent set
    copyType == CopyType.TEACHER_COPY || copyType == CopyType.STUDENT_EXAM

  def shouldShuffleOptions: Boolean = isStudentExam

  def shouldIncludeOnlySelectedSections: Boolean = isStudentExam

  def shouldExcludeExamOwners: Boolean = isStudentExam

  def shouldCopyAnswers: Boolean = copyType == CopyType.WITH_ANSWERS

object ExamCopyContext:

  def forTeacherCopy(user: User): Builder = Builder(Some(user), CopyType.TEACHER_COPY)

  def forStudentExam(student: User): Builder = Builder(Some(student), CopyType.STUDENT_EXAM)

  def forCollaborativeExam(student: User): Builder = Builder(Some(student), CopyType.COLLABORATIVE_EXAM)

  /** Creates context for copying with answers. User is optional since WITH_ANSWERS copies don't need user metadata.
    */
  def forCopyWithAnswers(user: Option[User]): Builder = Builder(user, CopyType.WITH_ANSWERS)

  final class Builder private[ExamCopyContext] (
      private val user: Option[User],
      private val copyType: CopyType,
      private val selectedSections: Set[Long] = Set.empty
  ):

    def withSelectedSections(sections: java.util.Set[java.lang.Long] | Null): Builder =
      val newSections = Option(sections).map(_.asScala.map(_.longValue()).toSet).getOrElse(Set.empty)
      Builder(user, copyType, newSections)

    def build(): ExamCopyContext = ExamCopyContext(user, copyType, selectedSections)
