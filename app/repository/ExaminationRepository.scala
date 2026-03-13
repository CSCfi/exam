// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import database.EbeanQueryExtensions
import features.exam.copy.ExamCopyContext
import features.iop.collaboration.services.CollaborativeExamLoaderService
import io.ebean.text.PathProperties
import io.ebean.{DB, Database, Query}
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.exam.ExamState
import models.facility.ExamRoom
import models.iop.CollaborativeExam
import models.questions.QuestionType
import models.questions.{ClozeTestAnswer, Question}
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import security.BlockingIOExecutionContext
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.Using

class ExaminationRepository @Inject() (
    cel: CollaborativeExamLoaderService,
    blockingIOExecutionContext: BlockingIOExecutionContext,
    dateTimeHandler: DateTimeHandler
) extends Logging
    with EbeanQueryExtensions:

  private val db: Database                            = DB.getDefault
  private implicit val ec: BlockingIOExecutionContext = blockingIOExecutionContext

  private def doCreateExam(prototype: Exam, user: User, enrolment: ExamEnrolment): Option[Exam] =
    Using(db.beginTransaction()) { tx =>
      val isCollaborative = Option(enrolment.collaborativeExam).isDefined
      val reservation     = enrolment.reservation
      // TODO: support for optional sections in BYOD exams
      val ids = Option(reservation)
        .map(_ => enrolment.optionalSections.asScala.map(_.id.longValue()).toSet)
        .getOrElse(Set.empty[Long])

      val context =
        if isCollaborative then
          ExamCopyContext.forCollaborativeExam(user).withSelectedSections(ids).build()
        else ExamCopyContext.forStudentExam(user).withSelectedSections(ids).build()

      val studentExam = prototype.createCopy(context)
      studentExam.state = ExamState.INITIALIZED
      studentExam.creator = user
      if !isCollaborative then studentExam.parent = prototype

      studentExam.generateHash()
      db.save(studentExam)
      enrolment.exam = studentExam
      db.save(enrolment)
      tx.commit()
      studentExam
    }.toOption

  def processClozeTestQuestions(exam: Exam): Unit =
    val questionsToHide = scala.collection.mutable.Set[Question]()

    exam.examSections.asScala
      .flatMap(_.sectionQuestions.asScala)
      .filter(_.question.`type` == QuestionType.ClozeTestQuestion)
      .foreach { esq =>
        val answer = Option(esq.clozeTestAnswer).getOrElse {
          val newAnswer = new ClozeTestAnswer()
          newAnswer
        }
        answer.setQuestion(esq)
        esq.clozeTestAnswer = answer
        db.update(esq)
        questionsToHide.add(esq.question)
      }

    questionsToHide.foreach(_.question = null)

  def createFinalExam(clone: Exam, user: User, enrolment: ExamEnrolment): Future[Exam] =
    Future {
      clone.state = ExamState.STUDENT_STARTED
      db.update(clone)
      clone.cloned = false
      clone.setDerivedMaxScores()
      processClozeTestQuestions(clone)

      if Option(clone.examParticipation).isEmpty then
        val reservation       = enrolment.reservation
        val examParticipation = new ExamParticipation()
        examParticipation.user = user
        examParticipation.exam = clone
        examParticipation.collaborativeExam = enrolment.collaborativeExam
        examParticipation.reservation = reservation

        Option(enrolment.examinationEventConfiguration).foreach { config =>
          examParticipation.examinationEvent = config.examinationEvent
        }

        val now = Option(enrolment.examinationEventConfiguration) match
          case None =>
            Option(reservation) match
              case None    => dateTimeHandler.adjustDST(DateTime.now())
              case Some(r) => dateTimeHandler.adjustDST(DateTime.now(), r.machine.room)
          case Some(_) => DateTime.now()

        examParticipation.started = now
        db.save(examParticipation)

      clone
    }

  def getCollaborativeExam(hash: String): Future[Option[CollaborativeExam]] =
    Future {
      db.find(classOf[CollaborativeExam]).where().eq("hash", hash).find match
        case Some(ce) => Some(ce)
        case None =>
          db.find(classOf[Exam]).where().eq("hash", hash).find match
            case Some(exam) if !exam.examEnrolments.isEmpty =>
              Option(exam.examEnrolments.getFirst.collaborativeExam)
            case _ => None
    }

  def getPossibleClone(
      hash: String,
      user: User,
      ce: CollaborativeExam,
      pp: PathProperties
  ): Future[Option[Exam]] =
    Future {
      val baseQuery = createQuery(pp).where().eq("hash", hash).eq("creator", user)
      val query     = if Option(ce).isEmpty then baseQuery.isNotNull("parent") else baseQuery
      query.find
    }

  def getPrototype(hash: String, ce: CollaborativeExam, pp: PathProperties): Future[Option[Exam]] =
    if Option(ce).isDefined then cel.downloadExam(ce)
    else
      Future {
        createQuery(pp).where().eq("hash", hash).isNull("parent").find
      }

  private def createQuery(pp: PathProperties): Query[Exam] =
    val query = db.find(classOf[Exam])
    pp.apply(query)
    query

  private def isInEffect(ee: ExamEnrolment): Boolean =
    val now = Option(ee.examinationEventConfiguration)
      .map(_ => DateTime.now)
      .getOrElse(dateTimeHandler.adjustDST(DateTime.now()))

    Option(ee.reservation) match
      case Some(reservation) =>
        reservation.startAt.isBefore(now) && reservation.endAt.isAfter(now)
      case None =>
        Option(ee.examinationEventConfiguration).exists { config =>
          val start = config.examinationEvent.start
          val end   = start.plusMinutes(ee.exam.duration)
          start.isBefore(now) && end.isAfter(now)
        }

  def findEnrolment(
      user: User,
      prototype: Exam,
      ce: CollaborativeExam,
      allowFuture: Boolean
  ): Future[Option[ExamEnrolment]] =
    Future {
      val enrolments = db
        .find(classOf[ExamEnrolment])
        .fetch("reservation")
        .fetch("reservation.machine")
        .fetch("reservation.machine.room")
        .fetch("examinationEventConfiguration")
        .fetch("examinationEventConfiguration.examinationEvent")
        .where()
        .eq("user.id", user.id)
        .or()
        .eq("exam.id", prototype.id)
        .and()
        .eq("collaborativeExam.id", Option(ce).map(_.id).getOrElse(-1L))
        .isNull("exam.id")
        .endAnd()
        .endOr()
        .list
        .filter(e => allowFuture || isInEffect(e))

      if enrolments.size > 1 then logger.error("multiple enrolments found during examination")

      enrolments.headOption
    }

  def findRoom(enrolment: ExamEnrolment): Future[Option[ExamRoom]] =
    Future {
      db.find(classOf[ExamRoom])
        .fetch("mailAddress")
        .where()
        .eq("id", enrolment.reservation.machine.room.id)
        .find
    }

  def createExam(prototype: Exam, user: User, enrolment: ExamEnrolment): Future[Option[Exam]] =
    Future(doCreateExam(prototype, user, enrolment))
