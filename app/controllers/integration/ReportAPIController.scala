// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.integration

import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.scala.{DbApiHelper, JavaApiHelper}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}
import play.api.mvc.{Action, AnyContent, BaseController, ControllerComponents}
import security.scala.Auth.subjectNotPresent

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

class ReportAPIController @Inject() (
    val controllerComponents: ControllerComponents,
    implicit val ec: ExecutionContext
) extends BaseController
    with DbApiHelper
    with JavaApiHelper:

  def getExamEnrolments(start: Option[String], end: Option[String]): Action[AnyContent] =
    Action.andThen(subjectNotPresent) { _ =>
      val pp = PathProperties.parse(
        "(id, enrolledOn, noShow, " +
          "reservation(id, machine(id, name, room(name, roomCode)), startAt, endAt, externalReservation(orgName)), " +
          "examinationEventConfiguration(examinationEvent(start)), " +
          "exam(id, course(name, code, credits, identifier, courseImplementation, " +
          "gradeScale(description, displayName), organisation(code, name)), " +
          "softwares(name), duration, examType(type), creditType(type), executionType(type), " +
          "implementation, trialCount, answerLanguage, periodStart, periodEnd, " +
          "examParticipation(started, ended, id))" +
          ")"
      )

      val query = DB.find(classOf[ExamEnrolment])
      pp.apply(query)

      val participations = query
        .where()
        .ne("exam.state", Exam.State.PUBLISHED)
        .or()
        .isNotNull("reservation.machine")
        .isNotNull("reservation.externalReservation")
        .isNotNull("examinationEventConfiguration")
        .endOr()
        .list
        .filter(ee => filterByDate(ee, start, end))

      // Relations from exam to software exist on the parent exam. Therefore, fetch parent exam IDs separately
      val parentExamIds = participations.flatMap { participation =>
        Option(participation.getExam)
          .flatMap(exam => Option(exam.getParent))
          .map(_.getId)
      }.toSet

      val softwareByExam = DB
        .find(classOf[Exam])
        .fetch("softwares", "name")
        .where()
        .idIn(parentExamIds.map(id => Long.box(id)).asJava)
        .list
        .map(exam => exam.getId -> exam.getSoftwareInfo.asScala.toList)
        .toMap

      // Set software lists to child exams
      participations.foreach { participation =>
        for
          exam     <- Option(participation.getExam)
          parent   <- Option(exam.getParent)
          software <- softwareByExam.get(parent.getId) if software.nonEmpty
        do exam.setSoftwareInfo(software.asJava)
      }

      Ok(participations.asJson(pp))
    }

  private def filterByDate(enrolment: ExamEnrolment, start: Option[String], end: Option[String]): Boolean =
    val min       = start.getOrElse(new DateTime(0L).toDateTimeISO.toString)
    val max       = end.getOrElse(new DateTime(Long.MaxValue).toDateTimeISO.toString)
    val startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(min)
    val endDate   = ISODateTimeFormat.dateTimeParser().parseDateTime(max)
    val range     = new Interval(startDate, endDate)

    Option(enrolment.getReservation)
      .map { reservation =>
        val period = new Interval(reservation.getStartAt, reservation.getEndAt)
        range.contains(period)
      }
      .orElse {
        Option(enrolment.getExaminationEventConfiguration).map { config =>
          val event    = config.getExaminationEvent
          val duration = enrolment.getExam.getDuration
          val period   = new Interval(event.getStart, event.getStart.plusMinutes(duration))
          range.contains(period)
        }
      }
      .getOrElse(true) // if we have no date info on this object, just show it
