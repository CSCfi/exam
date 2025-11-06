// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.enrolment

import controllers.base.scala.ExamBaseController
import io.ebean.DB
import io.ebean.text.PathProperties
import miscellaneous.config.{ByodConfigHandler, ConfigReader}
import miscellaneous.scala.DbApiHelper
import models.calendar.MaintenancePeriod
import models.enrolment.{ExaminationEvent, ExaminationEventConfiguration}
import models.exam.{Exam, ExaminationDate}
import models.user.Role
import org.joda.time.format.ISODateTimeFormat
import org.joda.time.{DateTime, Interval}
import play.api.Logging
import play.api.mvc.*
import security.scala.Auth.{AuthenticatedAction, authorized}
import validation.scala.core.{ScalaAttrs, Validators}
import validation.scala.exam.{ExaminationDateValidator, ExaminationEventValidator}

import java.util.UUID
import javax.inject.Inject

class ExaminationEventController @Inject() (
    byodConfigHandler: ByodConfigHandler,
    configReader: ConfigReader,
    authenticated: AuthenticatedAction,
    validators: Validators,
    val controllerComponents: ControllerComponents
)(implicit ec: scala.concurrent.ExecutionContext)
    extends BaseController
    with DbApiHelper
    with ExamBaseController
    with Logging:

  // PRINTOUT EXAM RELATED -->
  def insertExaminationDate(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationDateValidator)) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case None => NotFound("exam not found")
          case Some(exam) =>
            val date = request.attrs(ScalaAttrs.DATE)
            val ed   = new ExaminationDate()
            ed.setDate(date.toDate)
            ed.setExam(exam)
            ed.save()
            Ok(ed.asJson)
      }

  def removeExaminationDate(id: Long, edid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      Option(DB.find(classOf[ExaminationDate], edid)) match
        case None => NotFound("examination date not found")
        case Some(ed) =>
          ed.delete()
          Ok
    }

  // <--
  private def getEventEnding(ee: ExaminationEvent): DateTime =
    Option(ee.getExaminationEventConfiguration) match
      case None         => ee.getStart
      case Some(config) => ee.getStart.plusMinutes(config.getExam.getDuration)

  private def getParticipantUpperBound(start: DateTime, end: DateTime, id: Option[Long]): Int =
    var query = DB.find(classOf[ExaminationEvent]).where().le("start", end)
    id.foreach(i => query = query.ne("id", i))

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

  def insertExaminationEvent(eid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationEventValidator)) { request =>
        Option(DB.find(classOf[Exam], eid)) match
          case None       => NotFound("exam not found")
          case Some(exam) =>
            // Note: Validation is handled by ExaminationEventValidator
            val dto   = request.attrs(ScalaAttrs.EXAMINATION_EVENT)
            val start = dto.start

            if start.isBeforeNow then Forbidden("i18n_error_examination_event_in_the_past")
            else
              val end = start.plusMinutes(exam.getDuration)
              if isWithinMaintenancePeriod(new Interval(start, end)) then
                Forbidden("i18n_error_conflicts_with_maintenance_period")
              else
                val ub       = getParticipantUpperBound(start, end, None)
                val capacity = dto.capacity
                if capacity + ub > configReader.getMaxByodExaminationParticipantCount then
                  Forbidden("i18n_error_max_capacity_exceeded")
                else
                  val quitPassword = dto.quitPassword
                  if exam.getImplementation == Exam.Implementation.CLIENT_AUTH && quitPassword.isEmpty then
                    Forbidden("no quit password provided")
                  else
                    val settingsPassword = dto.settingsPassword
                    if exam.getImplementation == Exam.Implementation.CLIENT_AUTH && settingsPassword.isEmpty then
                      Forbidden("no settings password provided")
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

                      for
                        qPwd <- quitPassword
                        sPwd <- settingsPassword
                      yield
                        encryptQuitPassword(eec, qPwd)
                        encryptSettingsPassword(eec, sPwd, qPwd)
                        // Pass back the plaintext password, so it can be shown to the user
                        eec.setQuitPassword(qPwd)
                        eec.setSettingsPassword(sPwd)

                      eec.save()
                      Ok(eec.asJson)
      }

  def updateExaminationEvent(eid: Long, eecid: Long): Action[AnyContent] =
    authenticated
      .andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT)))
      .andThen(validators.validated(ExaminationEventValidator)) { request =>
        val examOpt = Option(DB.find(classOf[Exam], eid))
        val eecOpt = DB
          .find(classOf[ExaminationEventConfiguration])
          .where()
          .idEq(eecid)
          .eq("exam.id", eid)
          .find

        (examOpt, eecOpt) match
          case (Some(exam), Some(eec)) =>
            // Note: Validation is handled by ExaminationEventValidator
            val dto           = request.attrs(ScalaAttrs.EXAMINATION_EVENT)
            val hasEnrolments = !eec.getExamEnrolments.isEmpty
            val ee            = eec.getExaminationEvent
            val quitPassword  = dto.quitPassword

            if eec.getExam.getImplementation == Exam.Implementation.CLIENT_AUTH && quitPassword.isEmpty then
              Forbidden("no quit password provided")
            else
              val settingsPassword = dto.settingsPassword
              if eec.getExam.getImplementation == Exam.Implementation.CLIENT_AUTH && settingsPassword.isEmpty then
                Forbidden("no settings password provided")
              else
                val start = dto.start
                if !hasEnrolments && start.isBeforeNow then Forbidden("i18n_error_examination_event_in_the_past")
                else
                  if !hasEnrolments then ee.setStart(start)

                  val end = start.plusMinutes(exam.getDuration)
                  if isWithinMaintenancePeriod(new Interval(start, end)) then
                    Forbidden("i18n_error_conflicts_with_maintenance_period")
                  else
                    val ub       = getParticipantUpperBound(start, end, Some(ee.getId))
                    val capacity = dto.capacity
                    if capacity + ub > configReader.getMaxByodExaminationParticipantCount then
                      Forbidden("i18n_error_max_capacity_exceeded")
                    else
                      ee.setCapacity(capacity)
                      ee.setDescription(dto.description)
                      ee.update()

                      (quitPassword, settingsPassword) match
                        case (Some(qPwd), Some(sPwd)) if !hasEnrolments =>
                          encryptQuitPassword(eec, qPwd)
                          encryptSettingsPassword(eec, sPwd, qPwd)
                          eec.save()
                          // Pass back the plaintext passwords
                          eec.setQuitPassword(qPwd)
                          eec.setSettingsPassword(sPwd)
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

                      Ok(eec.asJson)
          case _ => NotFound("event not found")
      }

  def removeExaminationEvent(eid: Long, eeid: Long): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val eecOpt  = DB.find(classOf[ExaminationEventConfiguration]).where().idEq(eeid).eq("exam.id", eid).find
      val examOpt = Option(DB.find(classOf[Exam], eid))

      (eecOpt, examOpt) match
        case (Some(eec), Some(_)) =>
          if !eec.getExamEnrolments.isEmpty then
            Forbidden("event can not be deleted because there are enrolments involved")
          else
            eec.delete()
            // Check if we can delete the event altogether (in case no configs are using it)
            val configs = DB
              .find(classOf[ExaminationEventConfiguration])
              .where()
              .eq("examinationEvent", eec.getExaminationEvent)
              .distinct

            if configs.isEmpty then eec.getExaminationEvent.delete()
            Ok
        case _ => NotFound("event not found")
    }

  private def encryptSettingsPassword(
      eec: ExaminationEventConfiguration,
      password: String,
      quitPassword: String
  ): Unit =
    try
      val oldPwd = Option(eec.getEncryptedSettingsPassword).map { encrypted =>
        byodConfigHandler.getPlaintextPassword(encrypted, eec.getSettingsPasswordSalt)
      }

      if !oldPwd.contains(password) then
        val newSalt = UUID.randomUUID().toString
        eec.setEncryptedSettingsPassword(byodConfigHandler.getEncryptedPassword(password, newSalt))
        eec.setSettingsPasswordSalt(newSalt)
        // Pre-calculate the config key
        eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash, quitPassword))
    catch
      case e: Exception =>
        logger.error("unable to set settings password", e)
        throw new RuntimeException(e)

  private def encryptQuitPassword(eec: ExaminationEventConfiguration, password: String): Unit =
    try
      val oldPwd = Option(eec.getEncryptedQuitPassword).map { encrypted =>
        byodConfigHandler.getPlaintextPassword(encrypted, eec.getQuitPasswordSalt)
      }

      if !oldPwd.contains(password) then
        val newSalt = UUID.randomUUID().toString
        eec.setEncryptedQuitPassword(byodConfigHandler.getEncryptedPassword(password, newSalt))
        eec.setQuitPasswordSalt(newSalt)
        // Pre-calculate the config key
        eec.setConfigKey(byodConfigHandler.calculateConfigKey(eec.getHash, password))
    catch
      case e: Exception =>
        logger.error("unable to set quit password", e)
        throw new RuntimeException(e)

  def listExaminationEvents(start: Option[String], end: Option[String]): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.ADMIN))) { _ =>
      val pp = PathProperties.parse(
        "(*, exam(*, course(*), examOwners(*)), examinationEvent(*), examEnrolments(*))"
      )
      var query = DB.find(classOf[ExaminationEventConfiguration]).apply(pp).where()

      start.foreach { s =>
        val startDate = DateTime.parse(s, ISODateTimeFormat.dateTimeParser())
        query = query.ge("examinationEvent.start", startDate.toDate)
      }

      end.foreach { e =>
        val endDate = DateTime.parse(e, ISODateTimeFormat.dateTimeParser())
        query = query.lt("examinationEvent.start", endDate.toDate)
      }

      val exams = query.eq("exam.state", Exam.State.PUBLISHED).distinct
      ok(exams, pp)
    }

  def listOverlappingExaminationEvents(start: String, duration: Int): Action[AnyContent] =
    authenticated.andThen(authorized(Seq(Role.Name.TEACHER, Role.Name.ADMIN, Role.Name.SUPPORT))) { _ =>
      val startDate = DateTime.parse(start, ISODateTimeFormat.dateTimeParser())
      val endDate   = startDate.plusMinutes(duration)
      val pp        = PathProperties.parse("(*, examinationEventConfiguration(exam(id, duration)))")

      val events = DB
        .find(classOf[ExaminationEvent])
        .where()
        .le("start", endDate)
        .distinct
        .filter(ee => !getEventEnding(ee).isBefore(startDate))

      ok(events, pp)
    }
