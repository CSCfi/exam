// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import models.exam.Exam
import models.iop.CollaborativeExam
import play.api.Logging
import security.BlockingIOExecutionContext

import javax.inject.Inject
import scala.concurrent.Future

/** Service for collaborative exam review operations
  *
  * Handles assessment retrieval and exam operations for reviews.
  */
class CollaborativeReviewService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    private val ec: BlockingIOExecutionContext
) extends Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  /** Get collaborative exam and downloaded exam
    *
    * @param examId
    *   the collaborative exam ID
    * @return
    *   Future containing Either[error message, (CollaborativeExam, Exam)]
    */
  def getExamForReview(examId: Long): Future[Either[String, (CollaborativeExam, Exam)]] =
    collaborativeExamService.findById(examId).flatMap {
      case None => Future.successful(Left("i18n_error_exam_not_found"))
      case Some(ce) =>
        examLoader.downloadExam(ce).map {
          case None       => Left("i18n_error_exam_not_found")
          case Some(exam) => Right((ce, exam))
        }
    }

  /** Get collaborative exam by external reference
    *
    * @param examRef
    *   the external reference
    * @return
    *   Future containing Either[error message, CollaborativeExam]
    */
  def getExamByExternalRef(examRef: String): Future[Either[String, CollaborativeExam]] =
    collaborativeExamService.findByExternalRef(examRef).map {
      case None     => Left("i18n_error_exam_not_found")
      case Some(ce) => Right(ce)
    }
