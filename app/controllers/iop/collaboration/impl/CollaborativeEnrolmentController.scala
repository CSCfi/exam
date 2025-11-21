// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.collaboration.impl

import controllers.iop.collaboration.api.CollaborativeExamLoader
import impl.ExamUpdater
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.ConfigReader
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.enrolment.EnrolmentHandler
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import models.exam.{Exam, ExamExecutionType}
import models.iop.CollaborativeExam
import models.user.{Role, User}
import org.joda.time.DateTime
import play.api.Logging
import play.api.mvc.Results.*
import play.api.mvc.{Action, AnyContent, ControllerComponents, Result}
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized, subjectNotPresent}
import system.AuditedAction

import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}
import scala.jdk.CollectionConverters.*

class CollaborativeEnrolmentController @Inject() (
    wsClient: play.api.libs.ws.WSClient,
    examUpdater: ExamUpdater,
    examLoader: CollaborativeExamLoader,
    configReader: ConfigReader,
    dateTimeHandler: DateTimeHandler,
    enrolmentHandler: EnrolmentHandler,
    authenticated: AuthenticatedAction,
    audited: AuditedAction,
    override val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends CollaborationController(wsClient, examUpdater, examLoader, configReader, controllerComponents)
    with DbApiHelper
    with JavaApiHelper
    with Logging:

  // Helper to convert Play JSON to Jackson JSON (for models that still use Jackson)
  private def toJacksonJson(value: play.api.libs.json.JsValue): com.fasterxml.jackson.databind.JsonNode =
    play.libs.Json.parse(play.api.libs.json.Json.stringify(value))

  private def isEnrollable(exam: Exam, homeOrg: String): Boolean =
    val orgCheck = Option(exam.getOrganisations) match
      case None => true
      case Some(orgs) =>
        val organisations = orgs.split(";")
        organisations.contains(homeOrg)

    orgCheck &&
    exam.getState == Exam.State.PUBLISHED &&
    exam.getExecutionType.getType == ExamExecutionType.Type.PUBLIC.toString &&
    Option(exam.getPeriodEnd).isDefined &&
    exam.getPeriodEnd.isAfterNow

  private def checkExam(exam: Option[Exam], user: User): Either[Result, Exam] =
    val homeOrg = configReader.getHomeOrganisationRef
    exam match
      case None                                                         => Left(NotFound("i18n_error_exam_not_found"))
      case Some(e) if !isEnrollable(e, homeOrg)                         => Left(NotFound("i18n_error_exam_not_found"))
      case Some(e) if !enrolmentHandler.isAllowedToParticipate(e, user) => Left(Forbidden("i18n_no_trials_left"))
      case Some(e)                                                      => Right(e)

  def searchExams(filter: Option[String]): Action[AnyContent] =
    controllerComponents.actionBuilder.andThen(subjectNotPresent).async { _ =>
      val request = getSearchRequest(filter)
      val homeOrg = configReader.getHomeOrganisationRef

      request.get().map { response =>
        findExamsToProcess(response) match
          case Left(result) => result
          case Right(items) =>
            val exams = items
              .map { case (ce, rev) => ce.getExam(toJacksonJson(rev)) }
              .filter(e => isEnrollable(e, homeOrg))
              .toSeq

            val pp = PathProperties.parse(
              """(examOwners(firstName, lastName),
                |examInspections(user(firstName, lastName)),
                |examLanguages(code, name),
                |id, name, periodStart, periodEnd,
                |enrollInstruction, implementation,
                |examinationEventConfigurations
                |)""".stripMargin
            )
            Ok(exams.asJson(pp))
      }
    }

  def checkIfEnrolled(id: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      Option(DB.find(classOf[CollaborativeExam], id)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          examLoader.downloadExam(ce).map { examOpt =>
            checkExam(examOpt, user) match
              case Left(result) => result
              case Right(_) =>
                val now = dateTimeHandler.adjustDST(DateTime.now())
                val enrolments = DB
                  .find(classOf[ExamEnrolment])
                  .where()
                  .eq("user", user)
                  .eq("collaborativeExam.id", id)
                  .disjunction()
                  .gt("reservation.endAt", now.toDate)
                  .isNull("reservation")
                  .endJunction()
                  .or()
                  .isNull("exam")
                  .eq("exam.state", Exam.State.STUDENT_STARTED)
                  .endOr()
                  .list
                Ok(enrolments.asJson)
          }
    }

  private def makeEnrolment(exam: CollaborativeExam, user: User): ExamEnrolment =
    val enrolment = new ExamEnrolment()
    enrolment.setEnrolledOn(DateTime.now())
    enrolment.setUser(user)
    enrolment.setCollaborativeExam(exam)
    enrolment.setRandomDelay()
    enrolment.save()
    enrolment

  private def handleFutureReservations(
      enrolments: Seq[ExamEnrolment],
      user: User,
      ce: CollaborativeExam
  ): Option[Result] =
    val now = dateTimeHandler.adjustDST(DateTime.now())
    val futureReservations = enrolments.filter { ee =>
      ee.getReservation.toInterval.isAfter(now)
    }

    if futureReservations.size > 1 then
      logger.error(
        s"Several enrolments with future reservations found for user $user and collaborative exam ${ce.getId}"
      )
      Some(InternalServerError)
    else if futureReservations.nonEmpty then
      futureReservations.head.delete()
      val newEnrolment = makeEnrolment(ce, user)
      Some(Ok(newEnrolment.asJson))
    else None

  private def doCreateEnrolment(ce: CollaborativeExam, user: User): Result =
    // Begin manual transaction
    val tx = DB.beginTransaction()
    try
      // Take pessimistic lock for user to prevent multiple enrolments creating
      DB.find(classOf[User]).forUpdate().where().eq("id", user.getId).findOne()

      val enrolments = DB
        .find(classOf[ExamEnrolment])
        .fetch("reservation")
        .where()
        .eq("user.id", user.getId)
        .eq("collaborativeExam.id", ce.getId)
        .list

      // already enrolled
      if enrolments.exists(_.getReservation == null) then Forbidden("i18n_error_enrolment_exists")
      // reservation in effect
      else if enrolments.map(_.getReservation).exists { r =>
          r.toInterval.contains(dateTimeHandler.adjustDST(DateTime.now(), r))
        }
      then Forbidden("i18n_reservation_in_effect")
      else
        handleFutureReservations(enrolments, user, ce).getOrElse {
          val newEnrolment = makeEnrolment(ce, user)
          tx.commit()
          Ok(newEnrolment.asJson)
        }
    finally tx.end()
    end try

  def createEnrolment(id: Long): Action[AnyContent] =
    audited.andThen(authenticated).andThen(authorized(Seq(Role.Name.ADMIN, Role.Name.STUDENT))).async { request =>
      val user = request.attrs(Auth.ATTR_USER)

      Option(DB.find(classOf[CollaborativeExam], id)) match
        case None => Future.successful(NotFound("i18n_error_exam_not_found"))
        case Some(ce) =>
          examLoader.downloadExam(ce).map {
            case None => NotFound("i18n_error_exam_not_found")
            case Some(exam) =>
              val homeOrg = configReader.getHomeOrganisationRef
              if !isEnrollable(exam, homeOrg) then NotFound("i18n_error_exam_not_found")
              else if enrolmentHandler.isAllowedToParticipate(exam, user) then doCreateEnrolment(ce, user)
              else Forbidden
          }
    }
