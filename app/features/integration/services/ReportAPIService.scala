// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanQueryExtensions
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.exam.ExamState
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}

import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

object ReportAPIService:
  private val PageSize = 1000

class ReportAPIService @Inject() () extends EbeanQueryExtensions:
  import ReportAPIService.PageSize

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

  /** Enrolments with a reservation or examination event inside [start, end], in keyset pages by id.
    * A coarse version of the date condition runs in SQL so that each page reads only rows that may
    * be in range; the exact check (see inRange) is applied to each page in memory. Dates are parsed
    * up front so that invalid input fails before the response starts.
    */
  def getExamEnrolments(
      start: Option[String],
      end: Option[String]
  )(using ExecutionContext): (Source[List[ExamEnrolment], NotUsed], PathProperties) =
    val startDate = start.map(ISODateTimeFormat.dateTimeParser().parseDateTime)
    val endDate   = end.map(ISODateTimeFormat.dateTimeParser().parseDateTime)
    val range = new Interval(
      startDate.getOrElse(new DateTime(0L)),
      endDate.getOrElse(new DateTime(Long.MaxValue))
    )
    val pages = keysetPages(PageSize, (ee: ExamEnrolment) => ee.id.longValue)(
      fetchPage(startDate, endDate, _)
    ) { rows =>
      val participations = rows.filter(inRange(_, range))
      setParentSoftware(participations)
      participations
    }
    (pages, pathProperties)

  private def fetchPage(
      startDate: Option[DateTime],
      endDate: Option[DateTime],
      after: Option[Long]
  ): List[ExamEnrolment] =
    val query = DB
      .find(classOf[ExamEnrolment])
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

    def within(el: ExpressionList[ExamEnrolment], from: String, to: String) =
      val withStart = startDate.fold(el)(s => el.ge(from, s.toDate))
      endDate.fold(withStart)(e => withStart.le(to, e.toDate))

    // Superset of inRange: the event end depends on the exam duration, so only its start is
    // bounded here. Rows with neither reservation nor event are always in range.
    val inPeriod =
      if startDate.isEmpty && endDate.isEmpty then query
      else
        val eventStart  = "examinationEventConfiguration.examinationEvent.start"
        val reservation = within(query.or().and(), "reservation.startAt", "reservation.endAt")
        within(reservation.endAnd().and(), eventStart, eventStart)
          .endAnd()
          .and()
          .isNull("reservation")
          .isNull("examinationEventConfiguration")
          .endAnd()
          .endOr()

    after.fold(inPeriod)(id => inPeriod.gt("id", id)).orderBy("id").setMaxRows(PageSize).list

  // Relations from exam to software exist on the parent exam, so they are fetched separately
  private def setParentSoftware(participations: List[ExamEnrolment]): Unit =
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

  private def inRange(enrolment: ExamEnrolment, range: Interval): Boolean =
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
