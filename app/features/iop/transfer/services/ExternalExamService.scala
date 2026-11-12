// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.services

import database.EbeanPaths.path
import database.{EbeanJsonExtensions, EbeanQueryExtensions}
import features.examination.services.ExaminationService
import features.iop.collaboration.services.CollaborativeExamLoaderService
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.iop.ExternalExam
import play.api.Logging
import play.api.libs.json.{JsValue, Json}
import play.libs.Json as JavaJson
import security.BlockingIOExecutionContext
import services.enrolment.NoShowHandler
import services.exam.ExternalExamHandler
import services.iop.IopPayloads
import services.json.JsonDeserializer

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Using
import scala.util.control.NonFatal

class ExternalExamService @Inject() (
    externalExamHandler: ExternalExamHandler,
    noShowHandler: NoShowHandler,
    externalAttachmentLoader: ExternalAttachmentLoaderService,
    collaborativeExamLoader: CollaborativeExamLoaderService
)(implicit ec: BlockingIOExecutionContext)
    extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  private def getPath: PathProperties = IopPayloads.enrolmentPath

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
              DB.find(classOf[Exam]).where().eq(
                path[Exam]("hash"),
                ee.externalRef
              ).find
            if parent.isEmpty && Option(enrolment.collaborativeExam).isEmpty then
              Future.successful(Left(ExternalExamError.ParentExamNotFound))
            else
              // The sender retries until it gets a 201, so a failed copy must leave nothing behind
              val copied = Using.resource(DB.beginTransaction()) { tx =>
                externalExamHandler.createCopyForAssessment(enrolment, ee).map { ep =>
                  enrolment.exam = ep.exam
                  enrolment.update()
                  tx.commit()
                  ep
                }
              }
              copied match
                case Left(msg) =>
                  logger.error(
                    s"Could not copy exam for assessment of enrolment ${enrolment.id}: $msg"
                  )
                  Future.successful(Left(ExternalExamError.FailedToCopyExam))
                case Right(participation) =>
                  val clone = participation.exam
                  externalExamHandler.notifyAndAutoEvaluate(clone)

                  Option(enrolment.collaborativeExam) match
                    case Some(_) =>
                      collaborativeExamLoader
                        .createAssessment(participation)
                        .map(success =>
                          if success then Right(())
                          else Left(ExternalExamError.FailedToCreateAssessment)
                        )
                    case None =>
                      // Fetch external attachments for the local exam, not waiting for them
                      externalAttachmentLoader
                        .fetchExternalAttachmentsAsLocal(clone)
                        .failed
                        .foreach(e =>
                          logger.error(s"Could not fetch attachments of exam ${clone.id}", e)
                        )
                      Future.successful(Right(()))

  def provideEnrolment(ref: String): Future[Either[ExternalExamError, (JsValue, PathProperties)]] =
    getPrototype(ref) match
      case None => Future.successful(Left(ExternalExamError.EnrolmentNotFound))
      case Some(enrolment) =>
        Option(enrolment.collaborativeExam) match
          case Some(collaborativeExam) =>
            collaborativeExamLoader.downloadExam(collaborativeExam).map {
              case Some(exam) =>
                val pp = getPath
                Right((exam.asJson(pp), pp))
              case None => Left(ExternalExamError.CouldNotDownloadCollaborativeExam)
            }
          case None =>
            val exam = enrolment.exam
            // Never send duplicate option rows to the examination site, the exam is not saved here
            exam.examSections.asScala
              .flatMap(_.sectionQuestions.asScala)
              .foreach(esq => esq.options = esq.distinctOptions)

            val examAttachmentFuture = Option(exam.attachment)
              .map(externalAttachmentLoader.createExternalAttachment)
              .toSeq

            val questionAttachmentFutures = exam.examSections.asScala
              .flatMap(_.sectionQuestions.asScala)
              .map(_.question)
              .flatMap(q => Option(q.attachment))
              .toSet
              .map(externalAttachmentLoader.createExternalAttachment)
              .toSeq

            val allFutures = examAttachmentFuture ++ questionAttachmentFutures
            val pp         = getPath

            Future
              .sequence(allFutures)
              .map(_.collectFirst { case Left(reason) => reason } match
                case Some(reason) =>
                  logger.error(s"Could not provide enrolment [id=${enrolment.id}]: $reason")
                  Left(ExternalExamError.FailedToProvideEnrolment)
                case None => Right((exam.asJson(pp), pp))
              )
              .recover { case NonFatal(t) =>
                logger.error(s"Could not provide enrolment [id=${enrolment.id}]", t)
                Left(ExternalExamError.FailedToProvideEnrolment)
              }

  def addNoShow(ref: String): Either[ExternalExamError, Unit] =
    getPrototype(ref) match
      case Some(enrolment) =>
        noShowHandler.handleNoShowAndNotify(enrolment)
        Right(())
      case None => Left(ExternalExamError.EnrolmentNotFound)

  private def createQuery =
    DB.find(classOf[ExamEnrolment]).apply(ExaminationService.getPath(true))

  private def getPrototype(ref: String): Option[ExamEnrolment] =
    createQuery
      .where()
      .eq(path[ExamEnrolment]("reservation.externalRef"), ref)
      .or()
      .isNull(path[ExamEnrolment]("exam.parent"))
      .isNotNull(path[ExamEnrolment]("collaborativeExam"))
      .endOr()
      .orderBy()
      .asc(path[ExamEnrolment]("exam.examSections.id"))
      .orderBy()
      .asc(path[ExamEnrolment]("exam.examSections.sectionQuestions.sequenceNumber"))
      .find
