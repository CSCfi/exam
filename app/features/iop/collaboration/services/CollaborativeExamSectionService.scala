// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.collaboration.services

import database.EbeanQueryExtensions
import io.ebean.Model
import io.ebean.text.PathProperties
import models.exam.Exam
import models.sections.ExamSection
import models.user.User
import play.api.Logging
import security.BlockingIOExecutionContext
import services.config.ConfigReader
import services.exam.{ExamUpdater, SectionQuestionHandler}

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*

/** Service for collaborative exam section operations
  *
  * Handles section management for collaborative exams.
  */
class CollaborativeExamSectionService @Inject() (
    collaborativeExamService: CollaborativeExamService,
    examLoader: CollaborativeExamLoaderService,
    examUpdater: ExamUpdater,
    configReader: ConfigReader,
    private val ec: BlockingIOExecutionContext
) extends EbeanQueryExtensions
    with SectionQuestionHandler
    with Logging:
  implicit private val executionContext: BlockingIOExecutionContext = ec

  private def isAuthorizedToView(exam: Exam, user: User, homeOrg: String): Boolean =
    if exam.getOrganisations != null then
      val organisations = exam.getOrganisations.split(";")
      if !organisations.contains(homeOrg) then return false

    user.isAdminOrSupport ||
    (exam.getExamOwners.asScala.exists { u =>
      u.getEmail.equalsIgnoreCase(user.getEmail) ||
      u.getEmail.equalsIgnoreCase(user.getEppn)
    } && exam.hasState(Exam.State.PRE_PUBLISHED, Exam.State.PUBLISHED))

  private def createDraft(exam: Exam, user: User): ExamSection =
    val section = new ExamSection()
    section.setLotteryItemCount(1)
    section.setSectionQuestions(Set.empty[models.sections.ExamSectionQuestion].asJava)
    section.setSequenceNumber(exam.getExamSections.size())
    section.setExpanded(true)
    section.setId(newId())
    cleanUser(user)
    section.setCreatorWithDate(user)
    section

  private def cleanUser(user: User): Unit =
    user.setId(null)
    user.setEmail(null)
    user.setEppn(null)
    user.setFirstName(null)
    user.setLastName(null)

  private def newId(): Long = scala.util.Random.nextLong(9223372036854775807L)

  /** Get exam with authorization check
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @return
    *   Future containing Either[error message, (CollaborativeExam, Exam)]
    */
  private def getExamForSectionOperation(
      examId: Long,
      userId: Long
  ): Future[Either[String, (models.iop.CollaborativeExam, Exam)]] =
    val user    = io.ebean.DB.find(classOf[User], userId)
    val homeOrg = configReader.getHomeOrganisationRef

    (for
      ceOpt <- collaborativeExamService.findById(examId)
      ce <- ceOpt match
        case None     => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(ce) => Future.successful(ce)
      examOpt <- examLoader.downloadExam(ce)
      exam <- examOpt match
        case None    => Future.failed(new IllegalArgumentException("i18n_error_exam_not_found"))
        case Some(e) => Future.successful(e)
    yield
      if !isAuthorizedToView(exam, user, homeOrg) then
        Left("i18n_error_access_forbidden")
      else Right((ce, exam))).recoverWith { case e: IllegalArgumentException =>
      Future.successful(Left(e.getMessage))
    }

  /** Add a section to a collaborative exam
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @return
    *   Future containing Either[error message, ExamSection]
    */
  def addSection(examId: Long, userId: Long): Future[Either[String, ExamSection]] =
    getExamForSectionOperation(examId, userId).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right((ce, exam)) =>
        val user    = io.ebean.DB.find(classOf[User], userId)
        val section = createDraft(exam, user)
        exam.getExamSections.add(section)
        examLoader.uploadExam(ce, exam, user, section, null).map { result =>
          if result.header.status == play.api.mvc.Results.Ok.header.status then
            Right(section)
          else Left("Failed to upload exam")
        }
    }

  /** Update exam sections with a custom updater function
    *
    * @param examId
    *   the collaborative exam ID
    * @param userId
    *   the user ID
    * @param updater
    *   function to update the exam, returns Some(error) or None
    * @param resultProvider
    *   function to get the result model from the exam
    * @return
    *   Future containing Either[error message, Unit]
    */
  def updateSections(
      examId: Long,
      userId: Long,
      updater: (Exam, User) => Option[String],
      resultProvider: Exam => Option[? <: Model]
  ): Future[Either[String, Unit]] =
    getExamForSectionOperation(examId, userId).flatMap {
      case Left(error) => Future.successful(Left(error))
      case Right((ce, exam)) =>
        val user = io.ebean.DB.find(classOf[User], userId)
        updater(exam, user) match
          case Some(error) => Future.successful(Left(error))
          case None =>
            val pp = PathProperties.parse(
              "(*, question(*, attachment(*), questionOwners(*), tags(*), options(*)), options(*, option(*)))"
            )
            examLoader.uploadExam(ce, exam, user, resultProvider(exam).orNull, pp).map { result =>
              if result.header.status == play.api.mvc.Results.Ok.header.status then Right(())
              else Left("Failed to upload exam")
            }
    }
