// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.mail

import biweekly.component.VEvent
import biweekly.{Biweekly, ICalVersion, ICalendar}
import cats.effect.IO
import cats.effect.unsafe.implicits.global
import database.EbeanQueryExtensions
import io.ebean.DB
import models.assessment.LanguageInspection
import models.enrolment.*
import models.exam.*
import models.iop.CollaborativeExam
import models.user.User
import org.apache.commons.mail.EmailAttachment
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.i18n.{Lang, MessagesApi}
import play.api.{Environment, Logging, Mode}
import services.config.{ByodConfigHandler, ConfigReader}
import services.file.FileHandler

import java.io.{File, FileOutputStream, IOException}
import java.util.Date
import javax.inject.Inject
import scala.concurrent.duration.*
import scala.jdk.CollectionConverters.*
import scala.util.Using
import scala.util.control.Exception.catching

object EmailComposerImpl:
  private val TAG_OPEN  = "{{"
  private val TAG_CLOSE = "}}"
  private val DTF       = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm ZZZ")
  private val DF        = DateTimeFormat.forPattern("dd.MM.yyyy")
  private val TF        = DateTimeFormat.forPattern("HH:mm")
class EmailComposerImpl @Inject() (
    private val emailSender: EmailSender,
    private val fileHandler: FileHandler,
    private val env: Environment,
    private val messaging: MessagesApi,
    private val configReader: ConfigReader,
    private val byodConfigHandler: ByodConfigHandler
) extends EmailComposer
    with EbeanQueryExtensions
    with Logging:
  private val hostName      = configReader.getHostName
  private val timeZone      = configReader.getDefaultTimeZone
  private val systemAccount = configReader.getSystemAccount
  private val baseSystemUrl = configReader.getBaseSystemUrl
  private val templateRoot  = s"${env.rootPath.getAbsolutePath}/conf/template/email/"

  private def readTemplate(path: String): Either[String, String] =
    fileHandler.read(path).left.map { error =>
      logger.error(s"Failed to read email template from $path: $error")
      s"Failed to read email template: $error"
    }

  private def withTemplate(path: String)(f: String => Unit): Unit =
    readTemplate(path) match
      case Left(error)     => logger.error(error)
      case Right(template) => f(template)

  /** This notification is sent to a student when a teacher has reviewed the exam
    */
  override def composeInspectionReady(student: User, reviewer: Option[User], exam: Exam): Unit =
    val templatePath = s"${templateRoot}reviewReady.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang          = getLang(student)
        val subject       = messaging("email.inspection.ready.subject")(using lang)
        val examInfo      = s"${exam.name}, ${exam.course.code.split("_").head}"
        val reviewLink    = s"$hostName/participations"
        val autoEvaluated = reviewer.isEmpty && Option(exam.autoEvaluationConfig).nonEmpty
        val stringValues = Map(
          "review_done"      -> messaging("email.template.review.ready", examInfo)(using lang),
          "review_link"      -> reviewLink,
          "review_link_text" -> messaging("email.template.link.to.review")(using lang),
          "main_system_info" -> messaging("email.template.main.system.info")(using lang),
          "main_system_url"  -> baseSystemUrl,
          "review_autoevaluated" -> (if autoEvaluated then
                                       messaging("email.template.review.autoevaluated")(using lang)
                                     else "")
        )
        val content     = replaceAll(template, stringValues)
        val senderEmail = reviewer.flatMap(r => Option(r.email)).getOrElse(systemAccount)
        emailSender.send(Mail(student.email, senderEmail, subject, content))

  private def sendInspectionMessage(
      link: String,
      teacher: String,
      exam: String,
      msg: String,
      recipient: User,
      sender: User
  ): Unit =
    val lang = getLang(recipient)
    val stringValues = Map(
      "teacher_review_done" -> messaging("email.template.inspection.done", teacher)(using lang),
      "inspection_comment_title" -> messaging("email.template.inspection.comment")(using lang),
      "inspection_link_text"     -> messaging("email.template.link.to.review")(using lang),
      "exam_info"                -> exam,
      "inspection_link"          -> link,
      "inspection_comment"       -> msg
    )
    val templatePath = s"${templateRoot}inspectionReady.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val content = replaceAll(template, stringValues)
        val subject = messaging("email.inspection.comment.subject")(using lang)
        emailSender.send(Mail(recipient.email, sender.email, subject, content))

  /** This notification is sent to the creator of exam when assigned inspector has finished
    * inspection
    */
  override def composeInspectionMessage(
      inspector: User,
      sender: User,
      ce: CollaborativeExam,
      exam: Exam,
      msg: String
  ): Unit =
    val teacherName = s"${sender.firstName} ${sender.lastName} <${sender.email}>"
    val examInfo    = exam.name
    val linkToInspection =
      s"%$hostName/staff/assessments/${ce.id}/collaborative/${ce.revision}"
    sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender)

  /** This notification is sent to the creator of exam when assigned inspector has finished
    * inspection
    */
  override def composeInspectionMessage(
      inspector: User,
      sender: User,
      exam: Exam,
      msg: String
  ): Unit =
    val teacherName      = s"${sender.firstName} ${sender.lastName} <${sender.email}>"
    val examInfo         = s"${exam.name} (${exam.course.name})"
    val linkToInspection = s"$hostName/staff/assessments/${exam.id}"
    sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender)

  override def composeWeeklySummary(teacher: User): Unit =
    val lang           = getLang(teacher)
    val enrolmentBlock = createEnrolmentBlock(teacher, lang)
    val ungraded       = getReviews(teacher, Seq(ExamState.REVIEW, ExamState.REVIEW_STARTED))
    val graded         = getReviews(teacher, Seq(ExamState.GRADED))
    if enrolmentBlock.nonEmpty || ungraded.nonEmpty || graded.nonEmpty then
      logger.info(s"Sending weekly report to: ${teacher.email}")
      val templatePath = s"${templateRoot}weeklySummary/weeklySummary.html"
      readTemplate(templatePath) match
        case Left(error) => logger.error(error)
        case Right(template) =>
          val subject = messaging("email.weekly.report.subject")(using lang)
          val none    = messaging("email.template.weekly.report.none")(using lang)
          val values = Map(
            "enrolment_title" -> messaging("email.template.weekly.report.enrolments")(using lang),
            "enrolment_info_title" -> messaging("email.template.weekly.report.enrolments.info")(
              using lang
            ),
            "enrolment_info" -> (if enrolmentBlock.isEmpty then none else enrolmentBlock),
            "ungraded_title" -> messaging("email.template.weekly.report.ungraded")(using lang),
            "ungraded_info" -> messaging(
              "email.template.weekly.report.ungraded.info",
              ungraded.length
            )(
              using lang
            ),
            "ungraded_info_own" -> createAssessmentBlock(ungraded, lang).getOrElse(none),
            "graded_title"      -> messaging("email.template.weekly.report.graded")(using lang),
            "graded_info" -> messaging("email.template.weekly.report.graded.info", graded.length)(
              using lang
            ),
            "graded_info_own" -> createAssessmentBlock(graded, lang).getOrElse(none)
          )
          val content = replaceAll(template, values)
          emailSender.send(Mail(teacher.email, systemAccount, subject, content))

  override def composeExaminationEventNotification(
      recipient: User,
      enrolment: ExamEnrolment,
      isReminder: Boolean
  ): Unit =
    val templatePath = s"${templateRoot}examinationEventConfirmed.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val exam   = enrolment.exam
        val config = enrolment.examinationEventConfiguration
        val lang   = getLang(recipient)
        val subjectTemplate = messaging(
          if (isReminder) "email.examinationEvent.reminder.subject"
          else "email.examinationEvent.subject"
        )(using lang)
        val subject = s"$subjectTemplate: \"${exam.name}\""
        val courseCode =
          Option(exam.course).flatMap(c => Option(c.code)).map(c =>
            s"(${c.split("_").head})"
          ).getOrElse("")
        val examInfo    = s"${exam.name} $courseCode"
        val teacherName = getTeachers(exam)
        val startDate =
          EmailComposerImpl.DTF.print(new DateTime(config.examinationEvent.start, timeZone))
        val examDuration = s"${exam.duration / 60}h ${exam.duration % 60}min"
        val description  = config.examinationEvent.description
        val settingsFile =
          if exam.implementation == ExamImplementation.CLIENT_AUTH then
            s"<p>${messaging("email.examinationEvent.file.info")(using lang)}</p>"
          else ""
        val stringValues = Map(
          "title"     -> messaging("email.examinationEvent.title")(using lang),
          "exam_info" -> messaging("email.template.reservation.exam", examInfo)(using lang),
          "teacher_name" -> messaging("email.template.reservation.teacher", teacherName)(using
            lang
          ),
          "event_date" -> messaging("email.examinationEvent.date", startDate)(using lang),
          "exam_duration" -> messaging("email.template.reservation.exam.duration", examDuration)(
            using lang
          ),
          "description"       -> description,
          "cancellation_info" -> messaging("email.examinationEvent.cancel.info")(using lang),
          "cancellation_link" -> hostName,
          "cancellation_link_text" -> messaging("email.examinationEvent.cancel.link.text")(using
            lang
          ),
          "settings_file_info" -> settingsFile
        )
        val content = replaceAll(template, stringValues)
        if exam.implementation == ExamImplementation.CLIENT_AUTH then
          // Attach a SEB config file
          val quitPassword =
            byodConfigHandler.getPlaintextPassword(
              config.encryptedQuitPassword,
              config.quitPasswordSalt
            )
          val fileName = exam.name.replace(" ", "-")
          val file     = File.createTempFile(fileName, ".seb")
          val data = byodConfigHandler.getExamConfig(
            config.hash,
            config.encryptedSettingsPassword,
            config.settingsPasswordSalt,
            quitPassword
          )
          Using.resource(new FileOutputStream(file)) { stream =>
            stream.write(data)
          }
          val attachment = new EmailAttachment
          attachment.setPath(file.getAbsolutePath)
          attachment.setDisposition(EmailAttachment.ATTACHMENT)
          attachment.setName(s"$fileName.seb")
          if env.mode == Mode.Dev then
            logger.info(s"Wrote SEB config file to ${file.getAbsolutePath}")
          emailSender.send(Mail(
            recipient.email,
            systemAccount,
            subject,
            content,
            attachments = Set(attachment)
          ))
        else emailSender.send(Mail(recipient.email, systemAccount, subject, content))

  private def generateExaminationEventCancellationMail(
      exam: Exam,
      event: ExaminationEvent,
      lang: Lang,
      isForced: Boolean
  ) =
    val templatePath = s"${templateRoot}examinationEventCancelled.html"
    readTemplate(templatePath) match
      case Left(error) =>
        logger.error(error)
        ""
      case Right(template) =>
        val time        = EmailComposerImpl.DTF.print(adjustDST(event.start))
        val teacherName = getTeachers(exam)
        val courseCode =
          Option(exam.course).flatMap(c => Option(c.code)).map(c =>
            s"(${c.split("_").head})"
          ).getOrElse("")
        val examInfo = s"${exam.name} $courseCode"
        val msg =
          if isForced then "email.examinationEvent.cancel.message.admin"
          else "email.examinationEvent.cancel.message.student"
        val stringValues = Map(
          "exam"    -> messaging("email.template.reservation.exam", examInfo)(using lang),
          "teacher" -> messaging("email.template.reservation.teacher", teacherName)(using lang),
          "time"    -> messaging("email.examinationEvent.date", time)(using lang),
          "link"    -> hostName,
          "message" -> messaging(msg)(using lang),
          "new_time" -> messaging("email.examinationEvent.cancel.message.student.new.time")(
            using lang
          ),
          "description" -> event.description
        )
        replaceAll(template, stringValues)

  override def composeExaminationEventCancellationNotification(
      users: Set[User],
      exam: Exam,
      event: ExaminationEvent
  ): Unit =
    users.foreach((user: User) =>
      val lang    = getLang(user)
      val content = generateExaminationEventCancellationMail(exam, event, lang, true)
      val subject = messaging("email.examinationEvent.cancel.subject")(using lang)
      // email.examinationEvent.cancel.message.admin
      emailSender.send(Mail(user.email, systemAccount, subject, content))
    )

  override def composeExaminationEventCancellationNotification(
      user: User,
      exam: Exam,
      event: ExaminationEvent
  ): Unit =
    val lang    = getLang(user)
    val content = generateExaminationEventCancellationMail(exam, event, lang, false)
    val subject = messaging("email.examinationEvent.cancel.subject")(using lang)
    emailSender.send(Mail(user.email, systemAccount, subject, content))

  override def composeReservationNotification(
      recipient: User,
      reservation: Reservation,
      exam: Exam,
      isReminder: Boolean
  ): Unit =
    val templatePath = s"${templateRoot}reservationConfirmed.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang = getLang(recipient)
        val subjectTemplate =
          if (isReminder) "email.machine.reservation.reminder.subject"
          else "email.machine.reservation.subject"
        val subject = s"${messaging(subjectTemplate)(using lang)} \"${exam.name}\""
        val courseCode =
          Option(exam.course).flatMap(c => Option(c.code)).map(c =>
            s"(${c.split("_").head})"
          ).getOrElse("")
        val examInfo = s"${exam.name} $courseCode"
        val teacherName =
          if !exam.examOwners.isEmpty then getTeachers(exam)
          else s"${exam.creator.firstName} ${exam.creator.lastName}"
        val startDate = adjustDST(reservation.startAt)
        val endDate   = adjustDST(reservation.endAt)
        val reservationDate =
          s"${EmailComposerImpl.DTF.print(startDate)} - ${EmailComposerImpl.DTF.print(endDate)}"
        val examDuration = s"${exam.duration / 60}h ${exam.duration % 60}min"
        val machine      = reservation.machine
        val er           = reservation.externalReservation
        val machineName =
          Option(er).flatMap(e => Option(e.machineName)).getOrElse(machine.name)
        val buildingInfo =
          Option(er).flatMap(e => Option(e.buildingName)).getOrElse(
            machine.room.buildingName
          )
        val roomInstructions =
          if Option(er).isEmpty then
            Option(machine.room.getRoomInstructions(lang.asJava)).getOrElse("")
          else Option(er.getRoomInstructions(lang.asJava)).getOrElse("")
        val roomName =
          Option(er).flatMap(e => Option(e.roomName)).getOrElse(machine.room.name)

        val stringValues = Map(
          "title"     -> messaging("email.template.reservation.new")(using lang),
          "exam_info" -> messaging("email.template.reservation.exam", examInfo)(using lang),
          "teacher_name" -> messaging("email.template.reservation.teacher", teacherName)(using
            lang
          ),
          "reservation_date" -> messaging("email.template.reservation.date", reservationDate)(using
            lang
          ),
          "exam_duration" -> messaging("email.template.reservation.exam.duration", examDuration)(
            using lang
          ),
          "building_info" -> messaging("email.template.reservation.building", buildingInfo)(using
            lang
          ),
          "room_name" -> messaging("email.template.reservation.room", roomName)(using lang),
          "machine_name" -> messaging("email.template.reservation.machine", machineName)(using
            lang
          ),
          "room_instructions" -> roomInstructions,
          "cancellation_info" -> messaging("email.template.reservation.cancel.info")(using lang),
          "cancellation_link" -> hostName,
          "cancellation_link_text" -> messaging("email.template.reservation.cancel.link.text")(
            using lang
          )
        )
        val content = replaceAll(template, stringValues)
        val mail    = Mail(recipient.email, systemAccount, subject, content)
        // Export as iCal format (local reservations only)
        if Option(er).isEmpty then
          val address = machine.room.mailAddress
          val addressString =
            Option(address).map(a => s"${a.street}, ${a.zip} ${a.city}").getOrElse("")
          val iCal =
            createReservationEvent(
              lang,
              startDate,
              endDate,
              addressString,
              List(buildingInfo, roomName, machineName)
            )
          val file = File.createTempFile(exam.name.replace(" ", "-"), ".ics")
          catching(classOf[IOException]).either {
            Biweekly.write(iCal).go(file)
          } match
            case Left(e) =>
              logger.error("Failed to create a temporary iCal file on disk!")
              throw new RuntimeException(e)
            case _ => // OK
              val attachment = new EmailAttachment
              attachment.setPath(file.getAbsolutePath)
              attachment.setDisposition(EmailAttachment.ATTACHMENT)
              attachment.setName(messaging("ical.reservation.filename", ".ics")(using lang))
              emailSender.send(mail.copy(attachments = Set(attachment)))
        else emailSender.send(mail)

  private def createReservationEvent(
      lang: Lang,
      start: DateTime,
      end: DateTime,
      address: String,
      placeInfo: List[String]
  ) =
    val iCal = new ICalendar
    iCal.setVersion(ICalVersion.V2_0)
    val event = new VEvent

    val summary = event.setSummary(messaging("ical.reservation.summary")(using lang))
    summary.setLanguage(lang.code)
    event.setDateStart(start.toDate)
    event.setDateEnd(end.toDate)
    event.setLocation(address)
    val roomInfo = placeInfo.mkString(", ")
    event.setDescription(messaging("ical.reservation.room.info", roomInfo)(using lang))
    iCal.addEvent(event)
    iCal

  override def composeExamReviewRequest(
      toUser: User,
      fromUser: User,
      exam: Exam,
      message: String
  ): Unit =
    val templatePath = s"${templateRoot}reviewRequest.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang             = getLang(toUser)
        val subject          = messaging("email.review.request.subject")(using lang)
        val teacherName      = s"${fromUser.firstName} ${fromUser.lastName} <${fromUser.email}>"
        val examInfo         = s"${exam.name} (${exam.course.code.split("_")(0)})"
        val linkToInspection = s"$hostName/staff/exams/${exam.id}/5"
        val exams =
          DB.find(classOf[Exam]).where.eq("parent.id", exam.id).eq(
            "state",
            ExamState.REVIEW
          ).list
        val values = Map(
          "new_reviewer" -> messaging("email.template.inspector.new", teacherName)(using lang),
          "exam_info"    -> examInfo,
          "participation_count" -> messaging("email.template.participation", exams.length)(using
          lang),
          "inspector_message"     -> messaging("email.template.inspector.message")(using lang),
          "exam_link"             -> linkToInspection,
          "exam_link_text"        -> messaging("email.template.link.to.exam")(using lang),
          "comment_from_assigner" -> message
        )
        val content = if exams.nonEmpty && exams.length < 6 then
          val list = exams.map(e =>
            s"<li>${e.creator.firstName} ${e.creator.lastName}</li>"
          ).mkString
          replaceAll(template, values + ("student_list" -> s"<ul>$list</ul>)"))
        else replaceAll(template.replace("<p>{{student_list}}</p>", ""), values)
        emailSender.send(Mail(toUser.email, fromUser.email, subject, content))

  private def getTeachersAsText(owners: Set[User]) = owners
    .map(o => s"${o.firstName} ${o.lastName}")
    .mkString(", ")

  override def composeReservationChangeNotification(
      current: Reservation,
      previous: Reservation
  ): Unit =
    readTemplate(s"${templateRoot}reservationChanged.html") match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang      = getLang(current.user)
        val enrolment = current.enrolment
        val startDate = adjustDST(enrolment.reservation.startAt)
        val endDate   = adjustDST(enrolment.reservation.endAt)
        val reservationDate =
          s"${EmailComposerImpl.DTF.print(startDate)} - ${EmailComposerImpl.DTF.print(endDate)}"
        val examName =
          Option(enrolment.exam).map(_.name).getOrElse(enrolment.collaborativeExam.name)
        val subject = messaging("email.template.reservation.change.subject", examName)(using lang)
        val previousSlot =
          s"${EmailComposerImpl.DTF.print(adjustDST(previous.startAt))} - ${EmailComposerImpl.DTF
              .print(adjustDST(previous.endAt))}"
        val newSlot =
          s"${EmailComposerImpl.DTF.print(adjustDST(current.startAt))} - ${EmailComposerImpl.DTF.print(adjustDST(current.endAt))}"
        val values = Map(
          "message" -> messaging("email.template.reservation.change.message")(using lang),
          "previousTimeslot" -> messaging("email.template.reservation.change.previous.time")(
            using lang
          ),
          "previousTimeslotRange" -> previousSlot,
          "previousMachine" -> messaging("email.template.reservation.change.previous")(using lang),
          "previousMachineName" -> messaging(
            "email.template.reservation.machine",
            previous.machine.name
          )(using lang),
          "previousRoom" -> messaging(
            "email.template.reservation.room",
            previous.machine.room.name
          )(using lang),
          "previousBuilding" -> messaging(
            "email.template.reservation.building",
            previous.machine.room.buildingName
          )(using lang),
          "currentTimeslot" -> messaging("email.template.reservation.change.current.time")(
            using lang
          ),
          "currentTimeslotRange" -> newSlot,
          "currentMachine" -> messaging("email.template.reservation.change.current")(
            using lang
          ),
          "currentMachineName" -> messaging(
            "email.template.reservation.machine",
            current.machine.name
          )(using lang),
          "currentRoom" -> messaging(
            "email.template.reservation.room",
            current.machine.room.name
          )(using lang),
          "currentBuilding" -> messaging(
            "email.template.reservation.building",
            current.machine.room.buildingName
          )(
            using lang
          ),
          "cancellationInfo" -> messaging("email.template.reservation.cancel.info")(using lang),
          "cancellationLink" -> hostName,
          "cancellationLinkText" -> messaging("email.template.reservation.cancel.link.text")(
            using lang
          )
        )
        val content = replaceAll(template, values)
        emailSender.send(Mail(current.user.email, systemAccount, subject, content))

  private def sendReservationCancellationNotification(
      values: Map[String, String],
      message: Option[String],
      info: String,
      lang: Lang,
      email: String,
      template: String,
      subject: String
  ): Unit =
    val extraValues = Map(
      "cancellation_information" -> message.map(msg => s"$info:<br />$msg").getOrElse(""),
      "regards"                  -> messaging("email.template.regards")(using lang),
      "admin"                    -> messaging("email.template.admin")(using lang)
    )
    val content = replaceAll(template, values ++ extraValues)
    emailSender.send(Mail(email, systemAccount, subject, content))

  private def doComposeReservationSelfCancellationNotification(
      email: String,
      lang: Lang,
      reservation: Reservation,
      message: Option[String],
      enrolment: ExamEnrolment
  ): Unit =
    val templatePath = s"${templateRoot}reservationCanceledByStudent.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val subject = messaging("email.reservation.cancellation.subject")(using lang)
        val room =
          Option(reservation.machine)
            .flatMap(m => Option(m.room))
            .flatMap(r => Option(r.name))
            .getOrElse(reservation.externalReservation.roomName)
        val info = messaging("email.reservation.cancellation.info")(using lang)
        val time = s"${EmailComposerImpl.DTF
            .print(adjustDST(reservation.startAt))} - ${EmailComposerImpl.DTF.print(adjustDST(reservation.endAt))}"
        val owners = Option(enrolment.exam.parent).map(_.examOwners).getOrElse(
          enrolment.exam.examOwners
        )
        val examName = Option(enrolment.exam)
          .map(e => s"${e.name} (${e.course.code.split("_")(0)})")
          .getOrElse(enrolment.collaborativeExam.name)
        val stringValues = Map(
          "message" -> messaging("email.template.reservation.cancel.message.student")(using lang),
          "exam"    -> messaging("email.template.reservation.exam", examName)(using lang),
          "teacher" -> messaging(
            "email.template.reservation.teacher",
            getTeachersAsText(owners.asScala.toSet)
          )(using lang),
          "time"  -> messaging("email.template.reservation.date", time)(using lang),
          "place" -> messaging("email.template.reservation.room", room)(using lang),
          "new_time" -> messaging("email.template.reservation.cancel.message.student.new.time")(
            using lang
          ),
          "link" -> hostName
        )
        sendReservationCancellationNotification(
          stringValues,
          message,
          info,
          lang,
          email,
          template,
          subject
        )

  private def doComposeReservationAdminCancellationNotification(
      email: String,
      lang: Lang,
      reservation: Reservation,
      message: Option[String],
      examName: String
  ): Unit =
    val templatePath = s"${templateRoot}reservationCanceled.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val subject =
          messaging("email.reservation.cancellation.subject.forced", examName)(using lang)
        val date = EmailComposerImpl.DF.print(adjustDST(reservation.startAt))
        val room =
          Option(reservation.machine)
            .flatMap(m => Option(m.room))
            .flatMap(r => Option(r.name))
            .getOrElse(reservation.externalReservation.roomName)
        val info = messaging("email.reservation.cancellation.info")(using lang)
        val time = EmailComposerImpl.TF.print(adjustDST(reservation.startAt))
        val stringValues = Map(
          "message" -> messaging("email.template.reservation.cancel.message", date, time, room)(
            using lang
          )
        )
        sendReservationCancellationNotification(
          stringValues,
          message,
          info,
          lang,
          email,
          template,
          subject
        )

  override def composeExternalReservationCancellationNotification(
      reservation: Reservation,
      message: Option[String]
  ): Unit =
    doComposeReservationAdminCancellationNotification(
      reservation.externalUserRef,
      Lang.get("en").get,
      reservation,
      message,
      "externally managed exam"
    )
  override def composeReservationCancellationNotification(
      student: User,
      reservation: Reservation,
      message: Option[String],
      isStudentUser: Boolean,
      enrolment: ExamEnrolment
  ): Unit =
    val email = student.email
    val lang  = getLang(student)
    if isStudentUser then
      doComposeReservationSelfCancellationNotification(email, lang, reservation, message, enrolment)
    else
      val examName =
        if (enrolment.exam != null) enrolment.exam.name
        else enrolment.collaborativeExam.name
      doComposeReservationAdminCancellationNotification(email, lang, reservation, message, examName)

  private def getTeachers(exam: Exam) =
    val teachers   = exam.examOwners.asScala
    val inspectors = exam.examInspections.asScala.map(_.user)
    (teachers ++ inspectors).map(u =>
      s"${u.firstName} ${u.lastName} <${u.email}>"
    ).mkString(", ")

  override def composePrivateExamParticipantNotification(
      student: User,
      fromUser: User,
      exam: Exam
  ): Unit =
    val templatePath = s"${templateRoot}participationNotification.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang           = getLang(student)
        val isMaturity     = exam.executionType.`type` == ExamExecutionType.Type.MATURITY.toString
        val isAquarium     = exam.implementation.toString == ExamImplementation.AQUARIUM.toString
        val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
        val subject = messaging(
          s"${templatePrefix}participant.notification.subject",
          s"${exam.name} (${exam.course.code.split("_")(0)})"
        )(using lang)
        val title = messaging(
          if isAquarium then s"${templatePrefix}participant.notification.title"
          else "email.template.participant.notification.title.examination.event"
        )(using lang)
        val examInfo = messaging(
          "email.template.participant.notification.exam",
          s"${exam.name} (${exam.course.code.split("_")(0)})"
        )(using lang)
        val teacherName =
          messaging("email.template.participant.notification.teacher", getTeachers(exam))(using
            lang
          )
        val events = exam.examinationEventConfigurations.asScala.toList
          .map(c => new DateTime(c.examinationEvent.start, timeZone))
          .sorted
          .map(EmailComposerImpl.DTF.print)
          .mkString(", ")
        val examPeriod =
          if isAquarium then
            messaging(
              "email.template.participant.notification.exam.period",
              s"${EmailComposerImpl.DF.print(new DateTime(exam.periodStart))} - ${EmailComposerImpl.DF
                  .print(new DateTime(exam.periodEnd))}"
            )(using lang)
          else
            messaging("email.template.participant.notification.exam.event", s"$events ($timeZone)")(
              using lang
            )

        val examDuration =
          messaging("email.template.participant.notification.exam.duration", exam.duration)(
            using lang
          )
        val reservationInfo =
          if isAquarium then ""
          else
            s"<p>${messaging("email.template.participant.notification.please.reserve")(using lang)}</p>"
        val bookingLink =
          if exam.implementation == ExamImplementation.AQUARIUM then
            s"$hostName/calendar/${exam.id}"
          else hostName
        val stringValues = Map(
          "title"            -> title,
          "exam_info"        -> examInfo,
          "teacher_name"     -> teacherName,
          "exam_period"      -> examPeriod,
          "exam_duration"    -> examDuration,
          "reservation_info" -> reservationInfo,
          "booking_link"     -> bookingLink
        )

        val content = replaceAll(template, stringValues)
        emailSender.send(Mail(student.email, fromUser.email, subject, content))

  override def composePrivateExamEnded(toUser: User, exam: Exam): Unit =
    val lang           = getLang(toUser)
    val student        = exam.creator
    val isMaturity     = exam.executionType.`type` == ExamExecutionType.Type.MATURITY.toString
    val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
    val templatePath =
      if exam.state == ExamState.ABORTED then s"${templateRoot}examAborted.html"
      else s"${templateRoot}examEnded.html"
    val subject =
      if exam.state == ExamState.ABORTED then
        messaging(templatePrefix + "exam.aborted.subject")(using lang)
      else messaging(templatePrefix + "exam.returned.subject")(using lang)
    val path = if exam.state == ExamState.ABORTED then "aborted" else "returned"
    val msg =
      messaging(
        s"${templatePrefix}exam.$path.message",
        s"${student.firstName} ${student.lastName} <${student.email}>",
        s"${exam.name} (${exam.course.code.split("_")(0)})"
      )(using lang)
    val reviewLinkUrl  = s"$hostName/staff/assessments/${exam.id}"
    val reviewLinkText = messaging("email.template.exam.returned.link")(using lang)
    val stringValues = Map(
      "review_link"      -> reviewLinkUrl,
      "review_link_text" -> reviewLinkText,
      "message"          -> msg
    )
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val content = replaceAll(template, stringValues)
        emailSender.send(Mail(toUser.email, systemAccount, subject, content))

  override def composeNoShowMessage(toUser: User, student: User, exam: Exam): Unit =
    val templatePath = s"${templateRoot}noShow.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang           = getLang(toUser)
        val isMaturity     = exam.executionType.`type` == ExamExecutionType.Type.MATURITY.toString
        val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
        val subject        = messaging(s"${templatePrefix}noshow.subject")(using lang)
        val message = messaging(
          "email.template.noshow.message",
          s"${student.firstName} ${student.lastName} <${student.email}>",
          s"${exam.name} (${exam.course.code.split("_")(0)})"
        )(using lang)
        val stringValues = Map(
          "message" -> message
        )
        val content = replaceAll(template, stringValues)
        emailSender.send(Mail(toUser.email, systemAccount, subject, content))

  override def composeNoShowMessage(student: User, examName: String, courseCode: String): Unit =
    val templatePath = s"${templateRoot}noShow.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang          = getLang(student)
        val sanitizedCode = if courseCode.isEmpty then courseCode else s" ($courseCode)"
        val subject       = messaging("email.template.noshow.student.subject")(using lang)
        val message =
          messaging("email.template.noshow.student.message", examName, sanitizedCode)(using lang)
        val stringValues = Map(
          "message" -> message
        )
        val content = replaceAll(template, stringValues)
        emailSender.send(Mail(student.email, systemAccount, subject, content))

  override def composeLanguageInspectionFinishedMessage(
      toUser: User,
      inspector: User,
      inspection: LanguageInspection
  ): Unit =
    val templatePath = s"${templateRoot}languageInspectionReady.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val lang    = getLang(inspector)
        val exam    = inspection.exam
        val subject = messaging("email.template.language.inspection.subject")(using lang)
        val studentName =
          s"${exam.creator.firstName} ${exam.creator.lastName} <${exam.creator.email}>"
        val inspectorName =
          s"${inspector.firstName} ${inspector.lastName} <${inspector.email}>"
        val verdict = messaging(
          if (inspection.approved) "email.template.language.inspection.approved"
          else "email.template.language.inspection.rejected"
        )(using lang)
        val examInfo         = s"${exam.name}, ${exam.course.code.split("_")(0)}"
        val linkToInspection = s"$hostName/staff/assessments/${inspection.exam.id}"
        val stringValues = Map(
          "exam_info" -> messaging("email.template.reservation.exam", examInfo)(using lang),
          "inspector_name" -> messaging("email.template.reservation.teacher", inspectorName)(
            using lang
          ),
          "student_name" -> messaging("email.template.language.inspection.student", studentName)(
            using lang
          ),
          "inspection_done" -> messaging("email.template.language.inspection.done")(using lang),
          "statement_title" -> messaging("email.template.language.inspection.statement.title")(
            using lang
          ),
          "inspection_link_text" -> messaging("email.template.link.to.review")(using lang),
          "inspection_info" -> messaging("email.template.language.inspection.result", verdict)(
            using lang
          ),
          "inspection_link"      -> linkToInspection,
          "inspection_statement" -> inspection.statement.comment
        )
        val content = replaceAll(template, stringValues)
        emailSender.send(Mail(toUser.email, inspector.email, subject, content))

  override def composeCollaborativeExamAnnouncement(
      emails: Set[String],
      sender: User,
      exam: Exam
  ): Unit =
    val templatePath = s"${templateRoot}collaborativeExamNotification.html"
    readTemplate(templatePath) match
      case Left(error) => logger.error(error)
      case Right(template) =>
        val subject  = "New collaborative exam"
        val lang     = Lang.get("en").get
        val examInfo = exam.name
        val examPeriod = messaging(
          "email.template.participant.notification.exam.period",
          s"%${EmailComposerImpl.DF.print(new DateTime(exam.periodStart))} - ${EmailComposerImpl.DF
              .print(new DateTime(exam.periodEnd))}"
        )(using lang)
        val examDuration = s"${exam.duration / 60}h ${exam.duration % 60}min"
        val stringValues = Map(
          "exam_info"   -> messaging("email.template.reservation.exam", examInfo)(using lang),
          "exam_period" -> examPeriod,
          "exam_duration" -> messaging("email.template.reservation.exam.duration", examDuration)(
            using lang
          )
        )
        val content = replaceAll(template, stringValues)
        emailSender.send(Broadcast(
          emails,
          sender.email,
          subject,
          content,
          cc = Set(sender.email)
        ))

  private def getEnrolments(exam: Exam) = exam.examEnrolments.asScala
    .filter(ee =>
      val reservation = ee.reservation
      val eec         = ee.examinationEventConfiguration
      if Option(reservation).nonEmpty then reservation.startAt.isAfterNow
      else if Option(eec).nonEmpty then eec.examinationEvent.start.isAfterNow
      else false
    )
    .sorted
    .toList

  private def createEnrolmentBlock(teacher: User, lang: Lang) =
    val enrolmentTemplatePath = s"${templateRoot}weeklySummary/enrollmentInfo.html"
    readTemplate(enrolmentTemplatePath) match
      case Left(error) =>
        logger.error(error)
        ""
      case Right(enrolmentTemplate) =>
        DB
          .find(classOf[Exam])
          .fetch("course")
          .fetch("examEnrolments")
          .fetch("examEnrolments.reservation")
          .fetch("examEnrolments.examinationEventConfiguration.examinationEvent")
          .where
          .disjunction
          .eq("examOwners", teacher)
          .eq("examInspections.user", teacher)
          .endJunction
          .isNotNull("course")
          .eq("state", ExamState.PUBLISHED)
          .gt("periodEnd", new Date)
          .list
          .map(e => (e, getEnrolments(e)))
          .filterNot((_, ees) => ees.isEmpty)
          .map((exam, enrolments) =>
            val commonValues = Map(
              "exam_link"   -> s"$hostName/staff/reservations/${exam.id}",
              "exam_name"   -> exam.name,
              "course_code" -> exam.course.code.split("_").head
            )
            val subTemplate = if enrolments.isEmpty then
              val noEnrolments = messaging("email.enrolment.no.enrolments")(using lang)
              s"<li><a href=\"{{exam_link}}\">{{exam_name}} - {{course_code}}</a>: $noEnrolments</li>"
            else enrolmentTemplate
            val values =
              if enrolments.isEmpty then commonValues
              else
                val first = enrolments.head
                val date =
                  if Option(first.reservation).nonEmpty then
                    adjustDST(first.reservation.startAt)
                  else
                    new DateTime(
                      first.examinationEventConfiguration.examinationEvent.start,
                      timeZone
                    )
                commonValues + ("enrolments" ->
                  messaging(
                    "email.template.enrolment.first",
                    enrolments.length,
                    EmailComposerImpl.DTF.print(date)
                  )(using
                    lang
                  ))

            replaceAll(subTemplate, values)
          )
          .mkString

  // return exams in review state where the teacher is either owner or inspector
  private def getReviews(teacher: User, states: Seq[Exam.State]) = DB
    .find(classOf[ExamParticipation])
    .where
    .disjunction
    .eq("exam.parent.examOwners", teacher)
    .eq("exam.examInspections.user", teacher)
    .endJunction
    .in("exam.state", states.asJava)
    .isNotNull("exam.parent")
    .list

  private def createAssessmentBlock(assessments: Seq[ExamParticipation], lang: Lang) =
    readTemplate(s"${templateRoot}weeklySummary/inspectionInfoSimple.html") match
      case Left(error) =>
        logger.error(error)
        None
      case Right(template) =>
        val values = assessments
          .groupBy(_.exam.parent.id)
          .values
          .filter(_.nonEmpty)
          .map(group =>
            (group.head.exam.parent, group.length, group.minBy(_.deadline).deadline)
          )
          .toSeq
          .sortBy(_._3)
          .map { case (exam, amount, deadline) =>
            val summary =
              messaging(
                "email.weekly.report.review.summary",
                amount,
                EmailComposerImpl.DF.print(new DateTime(deadline))
              )(
                using lang
              )
            replaceAll(
              template,
              Map(
                "exam_link" -> s"$hostName/staff/exams/${exam.id}/5?collaborative=false",
                "exam_name" -> exam.name,
                "course_code" -> Option(exam.course)
                  .flatMap(c => Option(c.code))
                  .map(_.split("_").head)
                  .getOrElse(""),
                "review_summary" -> summary
              )
            )
          }
        Option.when(values.nonEmpty)(values.mkString)

  private def replaceAll(original: String, values: Map[String, String]) =
    values.foldLeft(original)((acc, kv) =>
      acc.replace(s"${EmailComposerImpl.TAG_OPEN}${kv._1}${EmailComposerImpl.TAG_CLOSE}", kv._2)
    )

  private def getLang(user: User) =
    val code = Option(user.language).flatMap(l => Option(l.code)).getOrElse("en")
    Lang.get(code).get

  private def adjustDST(date: DateTime) = {
    val dateTime = new DateTime(date, timeZone)
    if !timeZone.isStandardOffset(date.getMillis) then dateTime.minusHours(1)
    else dateTime
  }

  override def scheduleEmail(delay: Duration)(action: => Unit): Unit =
    (IO.sleep(delay) *> IO.blocking(action))
      .handleErrorWith(e => IO(logger.error("Error in scheduled email action", e)))
      .unsafeRunAndForget()
