// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl

import controllers.examination.ExaminationController
import controllers.iop.collaboration.api.CollaborativeExamLoader
import controllers.iop.transfer.api.ExternalAttachmentLoader
import impl.{ExternalExamHandler, NoShowHandler}
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.json.JsonDeserializer
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import models.iop.ExternalExam
import play.api.libs.json.{JsValue, Json}
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import play.db.ebean.Transactional
import play.libs.Json as JavaJson
import security.scala.Auth.subjectNotPresent
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class ExternalExamController @Inject() (
    externalExamHandler: ExternalExamHandler,
    audited: AuditedAction,
    noShowHandler: NoShowHandler,
    externalAttachmentLoader: ExternalAttachmentLoader,
    collaborativeExamLoader: CollaborativeExamLoader,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  private def getPath = {
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
  }

  @Transactional
  def addExamForAssessment(ref: String): Action[JsValue] =
    audited.andThen(subjectNotPresent).async(parse.json) { request =>
      getPrototype(ref) match
        case None            => Future.successful(NotFound("Enrolment not found"))
        case Some(enrolment) =>
          // Convert Play JSON to Jackson JsonNode for JsonDeserializer
          val body = JavaJson.parse(Json.stringify(request.body))
          Option(JsonDeserializer.deserialize(classOf[ExternalExam], body)) match
            case None => Future.successful(BadRequest("Invalid external exam data"))
            case Some(ee) =>
              val parent = DB.find(classOf[models.exam.Exam]).where().eq("hash", ee.getExternalRef).find
              if parent.isEmpty && Option(enrolment.getCollaborativeExam).isEmpty then
                Future.successful(NotFound("Parent exam not found"))
              else
                val clone = externalExamHandler.createCopyForAssessment(enrolment, ee)
                enrolment.setExam(clone)
                enrolment.update()

                Option(enrolment.getCollaborativeExam) match
                  case Some(_) =>
                    collaborativeExamLoader
                      .createAssessment(clone.getExamParticipation)
                      .map(success => if success then Created else InternalServerError("Failed to create assessment"))
                  case None =>
                    // Fetch external attachments for the local exam
                    externalAttachmentLoader.fetchExternalAttachmentsAsLocal(clone)
                    Future.successful(Created)
    }

  def provideEnrolment(ref: String): Action[AnyContent] =
    Action.andThen(subjectNotPresent).async { _ =>
      getPrototype(ref) match
        case None => Future.successful(NotFound("Enrolment not found"))
        case Some(enrolment) =>
          Option(enrolment.getCollaborativeExam) match
            case Some(collaborativeExam) =>
              collaborativeExamLoader.downloadExam(collaborativeExam).map {
                case Some(exam) =>
                  val pp = getPath
                  Ok(exam.asJson(pp))
                case None => InternalServerError("Could not download collaborative exam")
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
                .map(_ => Ok(exam.asJson(pp)))
                .recover { case t: Throwable =>
                  play.api.Logger("application").error(s"Could not provide enrolment [id=${enrolment.getId}]", t)
                  InternalServerError("Failed to provide enrolment")
                }
    }

  def addNoShow(ref: String): Action[AnyContent] =
    audited.andThen(subjectNotPresent) { _ =>
      getPrototype(ref) match
        case Some(enrolment) =>
          noShowHandler.handleNoShowAndNotify(enrolment)
          Ok
        case None => NotFound("Enrolment not found")
    }

  private def createQuery =
    val query = DB.find(classOf[ExamEnrolment])
    val props = ExaminationController.getPath(true)
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
