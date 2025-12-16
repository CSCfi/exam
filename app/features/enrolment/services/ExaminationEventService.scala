// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.enrolment.services

import io.ebean.DB
import io.ebean.text.PathProperties
import database.{EbeanQueryExtensions, EbeanJsonExtensions}
import models.calendar.MaintenancePeriod
import models.enrolment.{ExaminationEvent, ExaminationEventConfiguration}
import models.exam.{Exam, ExaminationDate}
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval, LocalDate}
import play.api.Logging
import services.config.{ByodConfigHandler, ConfigReader}
import validation.exam.ExaminationEventDTO

import java.util.UUID
import javax.inject.Inject
import scala.concurrent.ExecutionContext
import scala.util.Try

class ExaminationEventService @Inject() (
    private val byodConfigHandler: ByodConfigHandler,
    private val configReader: ConfigReader,
    implicit private val ec: ExecutionContext
) extends EbeanQueryExtensions
    with EbeanJsonExtensions
    with Logging:

  def insertExaminationDate(examId: Long, date: LocalDate): Either[ExaminationEventError, ExaminationDate] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Left(ExaminationEventError.ExamNotFound)
      case Some(exam) =>
        val ed = new ExaminationDate()
        ed.setDate(date.toDate)
        ed.setExam(exam)
        ed.save()
        Right(ed)

  def removeExaminationDate(dateId: Long): Either[ExaminationEventError, Unit] =
    Option(DB.find(classOf[ExaminationDate], dateId)) match
      case None => Left(ExaminationEventError.ExaminationDateNotFound)
      case Some(ed) =>
        ed.delete()
        Right(())

  private def getEventEnding(ee: ExaminationEvent): DateTime =
    Option(ee.getExaminationEventConfiguration) match
      case None         => ee.getStart
      case Some(config) => ee.getStart.plusMinutes(config.getExam.getDuration)

  private def getParticipantUpperBound(start: DateTime, end: DateTime, id: Option[Long]): Int =
    val baseQuery = DB.find(classOf[ExaminationEvent]).where().le("start", end)
    val query     = id.fold(baseQuery) { i => baseQuery.ne("id", i) }

    query.distinct
      .filter(ee => !getEventEnding(ee).isBefore(start))
      .map(_.getCapacity)
      .sum

  private def isWithinMaintenancePeriod(interval: Interval): Boolean =
    DB.find(classOf[MaintenancePeriod])
      .distinct
      .exists { p =>
        val maintenanceInterval = new Interval(p.getStartsAt, p.getEndsAt)
        maintenanceInterval.overlaps(interval)
      }

  def insertExaminationEvent(
      examId: Long,
      dto: ExaminationEventDTO
  ): Either[ExaminationEventError, ExaminationEventConfiguration] =
    Option(DB.find(classOf[Exam], examId)) match
      case None => Left(ExaminationEventError.ExamNotFound)
      case Some(exam) =>
        val start = dto.start

        if start.isBeforeNow then Left(ExaminationEventError.EventInThePast)
        else
          val end = start.plusMinutes(exam.getDuration)
          if isWithinMaintenancePeriod(new Interval(start, end)) then
            Left(ExaminationEventError.ConflictsWithMaintenancePeriod)
          else
            val ub       = getParticipantUpperBound(start, end, None)
            val capacity = dto.capacity
            if capacity + ub > configReader.getMaxByodExaminationParticipantCount then
              Left(ExaminationEventError.MaxCapacityExceeded)
            else
              val quitPassword = dto.quitPassword
              if exam.getImplementation == Exam.Implementation.CLIENT_AUTH && quitPassword.isEmpty then
                Left(ExaminationEventError.NoQuitPasswordProvided)
              else
                val settingsPassword = dto.settingsPassword
                if exam.getImplementation == Exam.Implementation.CLIENT_AUTH && settingsPassword.isEmpty then
                  Left(ExaminationEventError.NoSettingsPasswordProvided)
                else
                  val eec = new ExaminationEventConfiguration()
                  val ee  = new ExaminationEvent()
                  ee.setStart(start)
                  ee.setDescription(dto.description)
                  ee.setCapacity(dto.capacity)
                  ee.save()
                  eec.setExaminationEvent(ee)
                  eec.setExam(exam)
                  eec.setHash(UUID.randomUUID().toString)

                  (quitPassword, settingsPassword) match
                    case (Some(qPwd), Some(sPwd)) =>
                      (for
                        _ <- encryptQuitPassword(eec, qPwd)
                        _ <- encryptSettingsPassword(eec, sPwd, qPwd)
                      yield
                        // Pass back the plaintext password, so it can be shown to the user
                        eec.setQuitPassword(qPwd)
                        eec.setSettingsPassword(sPwd)
                      ) match
                        case Left(error) => Left(error)
                        case Right(_) =>
                          eec.save()
                          Right(eec)
                    case _ => Right(eec)

  def updateExaminationEvent(
      examId: Long,
      configId: Long,
      dto: ExaminationEventDTO
  ): Either[ExaminationEventError, ExaminationEventConfiguration] =
    val examOpt = Option(DB.find(classOf[Exam], examId))
    val eecOpt = DB
      .find(classOf[ExaminationEventConfiguration])
      .where()
      .idEq(configId)
      .eq("exam.id", examId)
      .find

    (examOpt, eecOpt) match
      case (Some(exam), Some(eec)) =>
        val hasEnrolments = !eec.getExamEnrolments.isEmpty
        val ee            = eec.getExaminationEvent
        val quitPassword  = dto.quitPassword

        if eec.getExam.getImplementation == Exam.Implementation.CLIENT_AUTH && quitPassword.isEmpty then
          Left(ExaminationEventError.NoQuitPasswordProvided)
        else
          val settingsPassword = dto.settingsPassword
          if eec.getExam.getImplementation == Exam.Implementation.CLIENT_AUTH && settingsPassword.isEmpty then
            Left(ExaminationEventError.NoSettingsPasswordProvided)
          else
            val start = dto.start
            if !hasEnrolments && start.isBeforeNow then Left(ExaminationEventError.EventInThePast)
            else
              if !hasEnrolments then ee.setStart(start)

              val end = start.plusMinutes(exam.getDuration)
              if isWithinMaintenancePeriod(new Interval(start, end)) then
                Left(ExaminationEventError.ConflictsWithMaintenancePeriod)
              else
                val ub       = getParticipantUpperBound(start, end, Some(ee.getId))
                val capacity = dto.capacity
                if capacity + ub > configReader.getMaxByodExaminationParticipantCount then
                  Left(ExaminationEventError.MaxCapacityExceeded)
                else
                  ee.setCapacity(capacity)
                  ee.setDescription(dto.description)
                  ee.update()

                  (quitPassword, settingsPassword) match
                    case (Some(qPwd), Some(sPwd)) if !hasEnrolments =>
                      (for
                        _ <- encryptQuitPassword(eec, qPwd)
                        _ <- encryptSettingsPassword(eec, sPwd, qPwd)
                      yield
                        eec.save()
                        // Pass back the plaintext passwords
                        eec.setQuitPassword(qPwd)
                        eec.setSettingsPassword(sPwd)
                      ) match
                        case Left(error) => Left(error)
                        case Right(_)    => Right(eec)
                    case (Some(_), Some(_)) =>
                      // Disallow changing password if enrolments exist - pass back original unchanged passwords
                      eec.setQuitPassword(
                        byodConfigHandler
                          .getPlaintextPassword(eec.getEncryptedQuitPassword, eec.getQuitPasswordSalt)
                      )
                      eec.setSettingsPassword(
                        byodConfigHandler.getPlaintextPassword(
                          eec.getEncryptedSettingsPassword,
                          eec.getSettingsPasswordSalt
                        )
                      )
                    case _ => ()

                  Right(eec)
      case _ => Left(ExaminationEventError.EventNotFound)

  def removeExaminationEvent(examId: Long, configId: Long): Either[ExaminationEventError, Unit] =
    val eecOpt  = DB.find(classOf[ExaminationEventConfiguration]).where().idEq(configId).eq("exam.id", examId).find
    val examOpt = Option(DB.find(classOf[Exam], examId))

    (eecOpt, examOpt) match
      case (Some(eec), Some(_)) =>
        if !eec.getExamEnrolments.isEmpty then Left(ExaminationEventError.EventHasEnrolments)
        else
          eec.delete()
          // Check if we can delete the event altogether (in case no configs are using it)
          val configs = DB
            .find(classOf[ExaminationEventConfiguration])
            .where()
            .eq("examinationEvent", eec.getExaminationEvent)
            .distinct

          if configs.isEmpty then eec.getExaminationEvent.delete()
          Right(())
      case _ => Left(ExaminationEventError.EventNotFound)

  private def encryptSettingsPassword(
      eec: ExaminationEventConfiguration,
      password: String,
      quitPassword: String
  ): Either[ExaminationEventError, Unit] =
    Try {
      val oldPwd = Option(eec.getEncryptedSettingsPassword).map { encrypted =>
        byodConfigHandler.getPlaintextPassword(encrypted, eec.getSettingsPasswordSalt)
      }

      if !oldPwd.contains(password) then
        val newSalt = UUID.randomUUID().toString
        eec.setEncryptedSettingsPassword(byodConfigHandler.getEncryptedPassword(password, newSalt))
        eec.setSettingsPasswordSalt(newSalt)
        // Pre-calculate the config key
        eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash, quitPassword))
      Right(())
    }.recover { case e: Exception =>
      logger.error("unable to set settings password", e)
      Left(ExaminationEventError.PasswordEncryptionFailed)
    }.get

  private def encryptQuitPassword(
      eec: ExaminationEventConfiguration,
      password: String
  ): Either[ExaminationEventError, Unit] =
    Try {
      val oldPwd = Option(eec.getEncryptedQuitPassword).map { encrypted =>
        byodConfigHandler.getPlaintextPassword(encrypted, eec.getQuitPasswordSalt)
      }

      if !oldPwd.contains(password) then
        val newSalt = UUID.randomUUID().toString
        eec.setEncryptedQuitPassword(byodConfigHandler.getEncryptedPassword(password, newSalt))
        eec.setQuitPasswordSalt(newSalt)
        // Pre-calculate the config key
        eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash, password))
      Right(())
    }.recover { case e: Exception =>
      logger.error("unable to set quit password", e)
      Left(ExaminationEventError.PasswordEncryptionFailed)
    }.get

  def listExaminationEvents(start: Option[String], end: Option[String]): List[ExaminationEventConfiguration] =
    val pp = PathProperties.parse(
      "(*, exam(*, course(*), examOwners(*)), examinationEvent(*), examEnrolments(*))"
    )
    val baseQuery = DB.find(classOf[ExaminationEventConfiguration]).apply(pp).where()

    val withStartFilter = start.fold(baseQuery) { s =>
      val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
      baseQuery.ge("examinationEvent.start", startDate.toDate)
    }

    val withEndFilter = end.fold(withStartFilter) { e =>
      val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
      withStartFilter.lt("examinationEvent.start", endDate.toDate)
    }

    withEndFilter.eq("exam.state", Exam.State.PUBLISHED).distinct.toList

  def listOverlappingExaminationEvents(start: String, duration: Int): List[ExaminationEvent] =
    val startDate = DateTime.parse(start, ISODateTimeFormat.dateTimeParser())
    val endDate   = startDate.plusMinutes(duration)
    val pp        = PathProperties.parse("(*, examinationEventConfiguration(exam(id, duration)))")

    DB.find(classOf[ExaminationEvent])
      .where()
      .le("start", endDate)
      .distinct
      .filter(ee => !getEventEnding(ee).isBefore(startDate))
      .toList
