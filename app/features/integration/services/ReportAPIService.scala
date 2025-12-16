// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamEnrolment
import models.exam.Exam
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ReportAPIService @Inject() () extends EbeanQueryExtensions:

  def getExamEnrolments(start: Option[String], end: Option[String]): List[ExamEnrolment] =
    val pp = PathProperties.parse(
      """(id, enrolledOn, noShow,
        |reservation(id,
        |  machine(id, name,
        |    room(name, roomCode)
        |  ),
        |  startAt, endAt,
        |  externalReservation(orgName)
        |),
        |examinationEventConfiguration(
        |  examinationEvent(start)
        |),
        |exam(id,
        |  course(name, code, credits, identifier, courseImplementation,
        |    gradeScale(description, displayName),
        |    organisation(code, name)
        |  ),
        |  softwares(name),
        |  duration,
        |  examType(type),
        |  creditType(type),
        |  executionType(type),
        |  implementation,
        |  trialCount,
        |  answerLanguage,
        |  periodStart,
        |  periodEnd,
        |  examParticipation(started, ended, id)
        |)
        |)""".stripMargin
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

    participations

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
