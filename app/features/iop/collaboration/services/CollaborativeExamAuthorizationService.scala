// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import models.exam.Exam
import models.iop.CollaborativeExam
import models.user.User
import play.api.Logging
import play.api.mvc.{Result, Results}
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

/** Service for collaborative exam authorization checks
  *
  * Handles authorization logic for viewing and assessing collaborative exams.
  */
class CollaborativeExamAuthorizationService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    private val ec: BlockingIOExecutionContext
) extends Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Check if a user is authorized to view an exam
    *
    * @param exam
    *   the exam to check
    * @param user
    *   the user requesting access
    * @param homeOrg
    *   the home organisation reference
    * @return
    *   true if authorized, false otherwise
    */
  def isAuthorizedToView(exam: Exam, user: User, homeOrg: String): Boolean =
    if exam.getOrganisations != null then
      val organisations = exam.getOrganisations.split(";")
      if !organisations.contains(homeOrg) then return false

    user.isAdminOrSupport ||
    (exam.getExamOwners.asScala.exists { u =>
      u.getEmail.equalsIgnoreCase(user.getEmail) ||
      u.getEmail.equalsIgnoreCase(user.getEppn)
    } && exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED))

  /** Check if a user is unauthorized to assess an exam
    *
    * @param exam
    *   the exam to check
    * @param user
    *   the user requesting access
    * @return
    *   true if unauthorized, false if authorized
    */
  def isUnauthorizedToAssess(exam: Exam, user: User): Boolean =
    !user.isAdminOrSupport &&
      (exam.getExamOwners.asScala.forall { u =>
        !u.getEmail.equalsIgnoreCase(user.getEmail) &&
        !u.getEmail.equalsIgnoreCase(user.getEppn)
      } || !exam.hasState(Exam.State.REVIEW, Exam.State.REVIEW_STARTED, Exam.State.GRADED))

  /** Find a collaborative exam by ID and return as Either
    *
    * @param id
    *   the exam ID
    * @return
    *   Future containing Either[Result error, CollaborativeExam]
    */
  def findCollaborativeExam(id: Long): Future[Either[Result, CollaborativeExam]] =
    collaborativeExamService.findById(id).map {
      case Some(ce) => Right(ce)
      case None     => Left(Results.NotFound("i18n_error_exam_not_found"))
    }

  /** Find a collaborative exam by external reference and return as Either
    *
    * @param ref
    *   the external reference
    * @return
    *   Future containing Either[Result error, CollaborativeExam]
    */
  def findCollaborativeExam(ref: String): Future[Either[Result, CollaborativeExam]] =
    collaborativeExamService.findByExternalRef(ref).map {
      case Some(ce) => Right(ce)
      case None     => Left(Results.NotFound("i18n_error_exam_not_found"))
    }
