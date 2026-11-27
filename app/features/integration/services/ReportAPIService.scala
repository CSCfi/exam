// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.integration.services

import database.EbeanPaths.{path, props}
import database.EbeanQueryExtensions
import io.ebean.text.PathProperties
import io.ebean.{DB, ExpressionList}
import models.enrolment.ExamEnrolment
import models.exam.Exam
import models.exam.ExamState
import org.apache.pekko.NotUsed
import org.apache.pekko.stream.scaladsl.Source
import services.datetime.IntervalExtensions.*
import services.datetime.{Interval, TimeUtils}

import java.time.{Duration, Instant}
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.jdk.CollectionConverters.*

object ReportAPIService:
  private val PageSize = 1000

class ReportAPIService @Inject() () extends EbeanQueryExtensions:
  import ReportAPIService.PageSize

  private val pathProperties = props[ExamEnrolment](
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
    val startDate = start.map(TimeUtils.parseInstant)
    val endDate   = end.map(TimeUtils.parseInstant)
    val range     = startDate.getOrElse(Instant.EPOCH) to endDate.getOrElse(Instant.MAX)
    val pages = keysetPages(PageSize, (ee: ExamEnrolment) => ee.id.longValue)(
      fetchPage(startDate, endDate, _)
    ) { rows =>
      val participations = rows.filter(inRange(_, range))
      setParentSoftware(participations)
      participations
    }
    (pages, pathProperties)

  private def fetchPage(
      startDate: Option[Instant],
      endDate: Option[Instant],
      after: Option[Long]
  ): List[ExamEnrolment] =
    val query = DB
      .find(classOf[ExamEnrolment])
      .apply(pathProperties)
      .where()
      .or()
      .ne(path[ExamEnrolment]("exam.state"), ExamState.PUBLISHED)
      .eq(path[ExamEnrolment]("noShow"), true)
      .endOr()
      .or()
      .isNotNull(path[ExamEnrolment]("reservation.machine"))
      .isNotNull(path[ExamEnrolment]("reservation.externalReservation"))
      .isNotNull(path[ExamEnrolment]("examinationEventConfiguration"))
      .endOr()

    def within(el: ExpressionList[ExamEnrolment], from: String, to: String) =
      val withStart = startDate.fold(el)(s => el.ge(from, s))
      endDate.fold(withStart)(e => withStart.le(to, e))

    // Superset of inRange: the event end depends on the exam duration, so only its start is
    // bounded here. Rows with neither reservation nor event are always in range.
    val inPeriod =
      if startDate.isEmpty && endDate.isEmpty then query
      else
        val eventStart = path[ExamEnrolment]("examinationEventConfiguration.examinationEvent.start")
        val reservation = within(
          query.or().and(),
          path[ExamEnrolment]("reservation.startAt"),
          path[ExamEnrolment]("reservation.endAt")
        )
        within(reservation.endAnd().and(), eventStart, eventStart)
          .endAnd()
          .and()
          .isNull(path[ExamEnrolment]("reservation"))
          .isNull(path[ExamEnrolment]("examinationEventConfiguration"))
          .endAnd()
          .endOr()

    after
      .fold(inPeriod)(id => inPeriod.gt(path[ExamEnrolment]("id"), id))
      .orderBy(path[ExamEnrolment]("id"))
      .setMaxRows(PageSize)
      .list

  // Relations from exam to software exist on the parent exam, so they are fetched separately
  private def setParentSoftware(participations: List[ExamEnrolment]): Unit =
    val parentExamIds = participations.flatMap { participation =>
      Option(participation.exam)
        .flatMap(exam => Option(exam.parent))
        .map(_.id)
    }.toSet

    val softwareByExam = DB
      .find(classOf[Exam])
      .fetch(path[Exam]("softwares"), "name")
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
        range.contains(reservation.startAt to reservation.endAt)
      }
      .orElse {
        Option(enrolment.examinationEventConfiguration).map { config =>
          val event = config.examinationEvent
          val period =
            event.start to event.start.plus(Duration.ofMinutes(enrolment.exam.duration.toLong))
          range.contains(period)
        }
      }
      .getOrElse(true) // if we have no date info on this object, just show it
