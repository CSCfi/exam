// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import features.examination.services.ExaminationService
import features.iop.collaboration.api.CollaborativeExamLoader
import features.iop.transfer.api.ExternalAttachmentLoader
import io.ebean.DB
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.enrolment.ExamEnrolment
import models.iop.ExternalExam
import play.api.Logging
import play.api.libs.json.{JsValue, Json}
import play.db.ebean.Transactional
import play.libs.{Json => JavaJson}
import services.enrolment.NoShowHandler
import services.exam.ExternalExamHandler
import services.json.JsonDeserializer

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters._

class ExternalExamService @Inject() (
    externalExamHandler: ExternalExamHandler,
    noShowHandler: NoShowHandler,
    externalAttachmentLoader: ExternalAttachmentLoader,
    collaborativeExamLoader: CollaborativeExamLoader
)(implicit ec: ExecutionContext)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private def getPath: PathProperties =
    val path = """(*,
                  |course(*, gradeScale(*, grades(*))),
                  |executionType(*),
                  |autoEvaluationConfig(*, gradeEvaluations(*, grade(*, gradeScale(*)))),
                  |examLanguages(*),
                  |attachment(*),
                  |examOwners(*),
                  |examInspections(*, user(*)),
                  |examType(*),
                  |creditType(*),
                  |gradeScale(*, grades(*)),
                  |examSections(*,
                  |  sectionQuestions(*,
                  |    question(*, attachment(*), options(*)),
                  |    options(*, option(*)),
                  |    essayAnswer(*, attachment(*)),
                  |    clozeTestAnswer(*)
                  |  )
                  |)
                  |)""".stripMargin
    PathProperties.parse(path)

  @Transactional
  def addExamForAssessment(ref: String, body: JsValue): Future[Either[ExternalExamError, Unit]] =
    getPrototype(ref) match
      case None            => Future.successful(Left(ExternalExamError.EnrolmentNotFound))
      case Some(enrolment) =>
        // Convert Play JSON to Jackson JsonNode for JsonDeserializer
        val jsonBody = JavaJson.parse(Json.stringify(body))
        Option(JsonDeserializer.deserialize(classOf[ExternalExam], jsonBody)) match
          case None => Future.successful(Left(ExternalExamError.InvalidExternalExamData))
          case Some(ee) =>
            val parent =
              DB.find(classOf[models.exam.Exam]).where().eq("hash", ee.getExternalRef).find
            if parent.isEmpty && Option(enrolment.getCollaborativeExam).isEmpty then
              Future.successful(Left(ExternalExamError.ParentExamNotFound))
            else
              val clone = externalExamHandler.createCopyForAssessment(enrolment, ee)
              enrolment.setExam(clone)
              enrolment.update()

              Option(enrolment.getCollaborativeExam) match
                case Some(_) =>
                  collaborativeExamLoader
                    .createAssessment(clone.getExamParticipation)
                    .map(success =>
                      if success then Right(())
                      else Left(ExternalExamError.FailedToCreateAssessment)
                    )
                case None =>
                  // Fetch external attachments for the local exam
                  externalAttachmentLoader.fetchExternalAttachmentsAsLocal(clone)
                  Future.successful(Right(()))

  def provideEnrolment(ref: String): Future[Either[ExternalExamError, (JsValue, PathProperties)]] =
    getPrototype(ref) match
      case None => Future.successful(Left(ExternalExamError.EnrolmentNotFound))
      case Some(enrolment) =>
        Option(enrolment.getCollaborativeExam) match
          case Some(collaborativeExam) =>
            collaborativeExamLoader.downloadExam(collaborativeExam).map {
              case Some(exam) =>
                val pp = getPath
                Right((exam.asJson(pp), pp))
              case None => Left(ExternalExamError.CouldNotDownloadCollaborativeExam)
            }
          case None =>
            val exam = enrolment.getExam

            val examAttachmentFuture = Option(exam.getAttachment)
              .map(att => externalAttachmentLoader.createExternalAttachment(att).map(_ => ()))
              .toSeq

            val questionAttachmentFutures = exam.getExamSections.asScala
              .flatMap(_.getSectionQuestions.asScala)
              .map(_.getQuestion)
              .flatMap(q => Option(q.getAttachment))
              .toSet
              .map(att => externalAttachmentLoader.createExternalAttachment(att).map(_ => ()))
              .toSeq

            val allFutures = examAttachmentFuture ++ questionAttachmentFutures
            val pp         = getPath

            Future
              .sequence(allFutures)
              .map(_ => Right((exam.asJson(pp), pp)))
              .recover { case t: Throwable =>
                logger.error(s"Could not provide enrolment [id=${enrolment.getId}]", t)
                Left(ExternalExamError.FailedToProvideEnrolment)
              }

  def addNoShow(ref: String): Either[ExternalExamError, Unit] =
    getPrototype(ref) match
      case Some(enrolment) =>
        noShowHandler.handleNoShowAndNotify(enrolment)
        Right(())
      case None => Left(ExternalExamError.EnrolmentNotFound)

  private def createQuery =
    val query = DB.find(classOf[ExamEnrolment])
    val props = ExaminationService.getPath(true)
    props.apply(query)
    query

  private def getPrototype(ref: String): Option[ExamEnrolment] =
    createQuery
      .where()
      .eq("reservation.externalRef", ref)
      .or()
      .isNull("exam.parent")
      .isNotNull("collaborativeExam")
      .endOr()
      .orderBy("exam.examSections.id, exam.examSections.sectionQuestions.sequenceNumber")
      .find
