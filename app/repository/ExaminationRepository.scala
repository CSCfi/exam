// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import controllers.exam.copy.ExamCopyContext
import controllers.iop.collaboration.api.CollaborativeExamLoader
import io.ebean.{DB, Database, Query, Transaction}
import io.ebean.text.PathProperties
import miscellaneous.datetime.DateTimeHandler
import miscellaneous.scala.DbApiHelper
import models.enrolment.{ExamEnrolment, ExamParticipation, Reservation}
import models.exam.Exam
import models.facility.ExamRoom
import models.iop.CollaborativeExam
import models.questions.{ClozeTestAnswer, Question}
import models.sections.ExamSection
import models.user.User
import org.joda.time.DateTime
import play.api.Logging

import javax.inject.Inject
import scala.concurrent.Future
import scala.jdk.CollectionConverters.*
import scala.util.{Try, Using}

class ExaminationRepository @Inject() (
    cel: CollaborativeExamLoader,
    databaseExecutionContext: DatabaseExecutionContext,
    dateTimeHandler: DateTimeHandler
) extends Logging
    with DbApiHelper:

  private val db: Database = DB.getDefault
  private implicit val ec: DatabaseExecutionContext = databaseExecutionContext

  private def doCreateExam(prototype: Exam, user: User, enrolment: ExamEnrolment): Option[Exam] =
    Using(db.beginTransaction()) { tx =>
      val isCollaborative = Option(enrolment.getCollaborativeExam).isDefined
      val reservation = enrolment.getReservation
      // TODO: support for optional sections in BYOD exams
      val ids = if reservation == null then
        Set.empty[java.lang.Long]
      else
        enrolment.getOptionalSections.asScala.map(_.getId).toSet

      val context = if isCollaborative then
        ExamCopyContext.forCollaborativeExam(user).withSelectedSections(ids.asJava).build()
      else
        ExamCopyContext.forStudentExam(user).withSelectedSections(ids.asJava).build()

      val studentExam = prototype.createCopy(context)
      studentExam.setState(Exam.State.INITIALIZED)
      studentExam.setCreator(user)
      if !isCollaborative then
        studentExam.setParent(prototype)

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

      if clone.getExamParticipation == null then
        val reservation = enrolment.getReservation
        val examParticipation = new ExamParticipation()
        examParticipation.setUser(user)
        examParticipation.setExam(clone)
        examParticipation.setCollaborativeExam(enrolment.getCollaborativeExam)
        examParticipation.setReservation(reservation)

        if enrolment.getExaminationEventConfiguration != null then
          examParticipation.setExaminationEvent(
            enrolment.getExaminationEventConfiguration.getExaminationEvent
          )

        val now = if enrolment.getExaminationEventConfiguration == null then
          if reservation == null then
            dateTimeHandler.adjustDST(DateTime.now())
          else
            dateTimeHandler.adjustDST(DateTime.now(), enrolment.getReservation.getMachine.getRoom)
        else
          DateTime.now()

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

  def getPossibleClone(hash: String, user: User, ce: CollaborativeExam, pp: PathProperties): Future[Option[Exam]] =
    Future {
      var query = createQuery(pp).where().eq("hash", hash).eq("creator", user)
      if ce == null then
        query = query.isNotNull("parent")

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
    val now = Option(ee.getExaminationEventConfiguration).map(_ => DateTime.now).getOrElse(dateTimeHandler.adjustDST(DateTime.now()))
    
    if ee.getReservation != null then
      ee.getReservation.getStartAt.isBefore(now) && ee.getReservation.getEndAt.isAfter(now)
    else if Option(ee.getExaminationEventConfiguration).isDefined then
      val start = ee.getExaminationEventConfiguration.getExaminationEvent.getStart
      val end = start.plusMinutes(ee.getExam.getDuration)
      start.isBefore(now) && end.isAfter(now)
    else
      false

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
        .eq("collaborativeExam.id", if ce != null then ce.getId else -1L)
        .isNull("exam.id")
        .endAnd()
        .endOr()
        .list
        .filter(e => allowFuture || isInEffect(e))
        
      if enrolments.size > 1 then
        logger.error("multiple enrolments found during examination")

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

