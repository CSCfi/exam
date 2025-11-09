// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.examination

import io.ebean.DB
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.ExamEnrolment
import models.user.Role
import org.joda.time.{DateTime, Seconds}
import play.api.mvc.*
import security.scala.Auth
import security.scala.Auth.{AuthenticatedAction, authorized}

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.util.Try

class TimeController @Inject() (
    dateTimeHandler: DateTimeHandler,
    val authenticated: AuthenticatedAction,
    val controllerComponents: ControllerComponents
)(implicit ec: ExecutionContext)
    extends BaseController
    with DbApiHelper:

  def getRemainingExamTime(hash: String): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.STUDENT))) { request =>
      val user = request.attrs(Auth.ATTR_USER)

      DB.find(classOf[ExamEnrolment])
        .fetch("externalExam")
        .where()
        .disjunction()
        .eq("exam.hash", hash)
        .eq("externalExam.hash", hash)
        .endJunction()
        .eq("user.id", user.getId)
        .find match
        case None => NotFound
        case Some(enrolment) =>
          val start    = getStart(enrolment)
          val duration = getDuration(enrolment)
          val now      = currentTime(enrolment)
          val timeLeft = Seconds.secondsBetween(now, start.plusMinutes(duration))
          Ok(timeLeft.getSeconds.toString)
    }

  private def getStart(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.getExaminationEventConfiguration) match
      case Some(config) => config.getExaminationEvent.getStart
      case None         => enrolment.getReservation.getStartAt

  private def currentTime(enrolment: ExamEnrolment): DateTime =
    Option(enrolment.getExaminationEventConfiguration) match
      case Some(_) => DateTime.now()
      case None    => dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation)

  private def getDuration(enrolment: ExamEnrolment): Int =
    Option(enrolment.getExam) match
      case Some(exam) => exam.getDuration.intValue()
      case None =>
        Try(enrolment.getExternalExam.deserialize().getDuration.intValue()).getOrElse(0)
