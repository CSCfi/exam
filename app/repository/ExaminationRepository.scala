// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import features.exam.copy.ExamCopyContext
import features.iop.collaboration.services.CollaborativeExamLoaderService
import io.ebean.text.PathProperties
import io.ebean.{DB, Database, Query}
import database.EbeanQueryExtensions
import models.enrolment.{ExamEnrolment, ExamParticipation}
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, Question}
import models.user.User
import org.joda.time.DateTime
import play.api.Logging
import services.datetime.DateTimeHandler

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters._
import scala.util.Using
import security.BlockingIOExecutionContext

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
      val isCollaborative = Option(enrolment.getCollaborativeExam).isDefined
      val reservation     = enrolment.getReservation
      // TODO: support for optional sections in BYOD exams
      val ids = Option(reservation)
        .map(_ => enrolment.getOptionalSections.asScala.map(_.getId.longValue()).toSet)
        .getOrElse(Set.empty[Long])

      val context =
        if isCollaborative then
          ExamCopyContext.forCollaborativeExam(user).withSelectedSections(ids).build()
        else ExamCopyContext.forStudentExam(user).withSelectedSections(ids).build()

      val studentExam = prototype.createCopy(context)
      studentExam.setState(Exam.State.INITIALIZED)
      studentExam.setCreator(user)
      if !isCollaborative then studentExam.setParent(prototype)

      studentExam.generateHash()
      db.save(studentExam)
      enrolment.setExam(studentExam)
      db.save(enrolment)
      tx.commit()
      studentExam
    }.toOption

  def processClozeTestQuestions(exam: Exam): Unit =
    val questionsToHide = scala.collection.mutable.Set[Question]()

    exam.getExamSections.asScala
      .flatMap(_.getSectionQuestions.asScala)
      .filter(_.getQuestion.getType == Question.Type.ClozeTestQuestion)
      .foreach { esq =>
        val answer = Option(esq.getClozeTestAnswer).getOrElse {
          val newAnswer = new ClozeTestAnswer()
          newAnswer
        }
        answer.setQuestion(esq)
        esq.setClozeTestAnswer(answer)
        db.update(esq)
        questionsToHide.add(esq.getQuestion)
      }

    questionsToHide.foreach(_.setQuestion(null))

  def createFinalExam(clone: Exam, user: User, enrolment: ExamEnrolment): Future[Exam] =
    Future {
      clone.setState(Exam.State.STUDENT_STARTED)
      db.update(clone)
      clone.setCloned(false)
      clone.setDerivedMaxScores()
      processClozeTestQuestions(clone)

      if Option(clone.getExamParticipation).isEmpty then
        val reservation       = enrolment.getReservation
        val examParticipation = new ExamParticipation()
        examParticipation.setUser(user)
        examParticipation.setExam(clone)
        examParticipation.setCollaborativeExam(enrolment.getCollaborativeExam)
        examParticipation.setReservation(reservation)

        Option(enrolment.getExaminationEventConfiguration).foreach { config =>
          examParticipation.setExaminationEvent(config.getExaminationEvent)
        }

        val now = Option(enrolment.getExaminationEventConfiguration) match
          case None =>
            Option(reservation) match
              case None    => dateTimeHandler.adjustDST(DateTime.now())
              case Some(r) => dateTimeHandler.adjustDST(DateTime.now(), r.getMachine.getRoom)
          case Some(_) => DateTime.now()

        examParticipation.setStarted(now)
        db.save(examParticipation)

      clone
    }

  def getCollaborativeExam(hash: String): Future[Option[CollaborativeExam]] =
    Future {
      db.find(classOf[CollaborativeExam]).where().eq("hash", hash).find match
        case Some(ce) => Some(ce)
        case None =>
          db.find(classOf[Exam]).where().eq("hash", hash).find match
            case Some(exam) if !exam.getExamEnrolments.isEmpty =>
              Option(exam.getExamEnrolments.getFirst.getCollaborativeExam)
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
    val now = Option(ee.getExaminationEventConfiguration)
      .map(_ => DateTime.now)
      .getOrElse(dateTimeHandler.adjustDST(DateTime.now()))

    Option(ee.getReservation) match
      case Some(reservation) =>
        reservation.getStartAt.isBefore(now) && reservation.getEndAt.isAfter(now)
      case None =>
        Option(ee.getExaminationEventConfiguration).exists { config =>
          val start = config.getExaminationEvent.getStart
          val end   = start.plusMinutes(ee.getExam.getDuration)
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
        .eq("user.id", user.getId)
        .or()
        .eq("exam.id", prototype.getId)
        .and()
        .eq("collaborativeExam.id", Option(ce).map(_.getId).getOrElse(-1L))
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
        .eq("id", enrolment.getReservation.getMachine.getRoom.getId)
        .find
    }

  def createExam(prototype: Exam, user: User, enrolment: ExamEnrolment): Future[Option[Exam]] =
    Future(doCreateExam(prototype, user, enrolment))
