// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.DB
import io.ebean.text.PathProperties
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.exam.ExamState
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}

import javax.inject.Inject
import scala.jdk.CollectionConverters.*

class ReportAPIService @Inject() () extends EbeanQueryExtensions:

  private val pathProperties = PathProperties.parse(
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

  def getExamEnrolments(
      start: Option[String],
      end: Option[String]
  ): (List[ExamEnrolment], PathProperties) =
    val participations = DB.find(classOf[ExamEnrolment])
      .apply(pathProperties)
      .where()
      .or()
      .ne("exam.state", ExamState.PUBLISHED)
      .eq("noShow", true)
      .endOr()
      .or()
      .isNotNull("reservation.machine")
      .isNotNull("reservation.externalReservation")
      .isNotNull("examinationEventConfiguration")
      .endOr()
      .list
      .filter(ee => filterByDate(ee, start, end))

    // Relations from exam to software exist on the parent exam. Therefore, fetch parent exam IDs separately
    val parentExamIds = participations.flatMap { participation =>
      Option(participation.exam)
        .flatMap(exam => Option(exam.parent))
        .map(_.id)
    }.toSet

    val softwareByExam = DB
      .find(classOf[Exam])
      .fetch("softwares", "name")
      .where()
      .idIn(parentExamIds.map(id => Long.box(id)).asJava)
      .list
      .map(exam => exam.id -> exam.softwares.asScala.toList)
      .toMap

    // Set software lists to child exams
    participations.foreach { participation =>
      for
        exam     <- Option(participation.exam)
        parent   <- Option(exam.parent)
        software <- softwareByExam.get(parent.id) if software.nonEmpty
      do exam.softwares = software.asJava
    }
    (participations, pathProperties)

  private def filterByDate(
      enrolment: ExamEnrolment,
      start: Option[String],
      end: Option[String]
  ): Boolean =
    val min       = start.getOrElse(new DateTime(0L).toDateTimeISO.toString)
    val max       = end.getOrElse(new DateTime(Long.MaxValue).toDateTimeISO.toString)
    val startDate = ISODateTimeFormat.dateTimeParser().parseDateTime(min)
    val endDate   = ISODateTimeFormat.dateTimeParser().parseDateTime(max)
    val range     = new Interval(startDate, endDate)

    Option(enrolment.reservation)
      .map { reservation =>
        val period = new Interval(reservation.startAt, reservation.endAt)
        range.contains(period)
      }
      .orElse {
        Option(enrolment.examinationEventConfiguration).map { config =>
          val event    = config.examinationEvent
          val duration = enrolment.exam.duration
          val period   = new Interval(event.start, event.start.plusMinutes(duration))
          range.contains(period)
        }
      }
      .getOrElse(true) // if we have no date info on this object, just show it
