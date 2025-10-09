// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail

import biweekly.component.VEvent
import biweekly.{Biweekly, ICalVersion, ICalendar}
import io.ebean.DB
import miscellaneous.config.{ByodConfigHandler, ConfigReader}
import miscellaneous.file.FileHandler
import miscellaneous.scala.DbApiHelper
import models.assessment.LanguageInspection
import models.enrolment._
import models.exam.{Exam, ExamExecutionType}
import models.facility.ExamMachine
import models.iop.CollaborativeExam
import models.user.User
import org.apache.commons.mail.EmailAttachment
import org.joda.time.DateTime
import org.joda.time.format.DateTimeFormat
import play.api.i18n.{Lang, MessagesApi}
import play.api.{Environment, Logging, Mode}

import java.io.{File, FileOutputStream, IOException}
import java.util.Date
import javax.inject.Inject
import scala.jdk.CollectionConverters._
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
    with DbApiHelper
    with Logging:
  private val hostName      = configReader.getHostName
  private val timeZone      = configReader.getDefaultTimeZone
  private val systemAccount = configReader.getSystemAccount
  private val baseSystemUrl = configReader.getBaseSystemUrl
  private val templateRoot  = s"${env.rootPath.getAbsolutePath}/conf/template/email/"

  /** This notification is sent to student, when teacher has reviewed the exam
    */
  override def composeInspectionReady(student: User, reviewer: User, exam: Exam): Unit =
    val templatePath  = s"${templateRoot}reviewReady.html"
    val template      = fileHandler.read(templatePath)
    val lang          = getLang(student)
    val subject       = messaging("email.inspection.ready.subject")(lang)
    val examInfo      = s"${exam.getName}, ${exam.getCourse.getCode.split("_").head}"
    val reviewLink    = s"$hostName/participations"
    val autoEvaluated = Option(reviewer).isEmpty && Option(exam.getAutoEvaluationConfig).nonEmpty
    val stringValues = Map(
      "review_done"          -> messaging("email.template.review.ready", examInfo)(lang),
      "review_link"          -> reviewLink,
      "review_link_text"     -> messaging("email.template.link.to.review")(lang),
      "main_system_info"     -> messaging("email.template.main.system.info")(lang),
      "main_system_url"      -> baseSystemUrl,
      "review_autoevaluated" -> (if autoEvaluated then messaging("email.template.review.autoevaluated")(lang) else "")
    )
    val content     = replaceAll(template, stringValues)
    val senderEmail = Option(reviewer).map(_.getEmail).nonNull.getOrElse(systemAccount)
    emailSender.send(Mail(student.getEmail, senderEmail, subject, content))

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
      "teacher_review_done"      -> messaging("email.template.inspection.done", teacher)(lang),
      "inspection_comment_title" -> messaging("email.template.inspection.comment")(lang),
      "inspection_link_text"     -> messaging("email.template.link.to.review")(lang),
      "exam_info"                -> exam,
      "inspection_link"          -> link,
      "inspection_comment"       -> msg
    )
    val templatePath = s"${templateRoot}inspectionReady.html"
    val template     = fileHandler.read(templatePath)
    val content      = replaceAll(template, stringValues)
    val subject      = messaging("email.inspection.comment.subject")(lang)
    emailSender.send(Mail(recipient.getEmail, sender.getEmail, subject, content))

  /** This notification is sent to the creator of exam when assigned inspector has finished inspection
    */
  override def composeInspectionMessage(
      inspector: User,
      sender: User,
      ce: CollaborativeExam,
      exam: Exam,
      msg: String
  ): Unit =
    val teacherName      = s"${sender.getFirstName} ${sender.getLastName} <${sender.getEmail}>"
    val examInfo         = exam.getName
    val linkToInspection = s"%$hostName/staff/assessments/${ce.getId}/collaborative/${ce.getRevision}"
    sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender)

  /** This notification is sent to the creator of exam when assigned inspector has finished inspection
    */
  override def composeInspectionMessage(inspector: User, sender: User, exam: Exam, msg: String): Unit =
    val teacherName      = s"${sender.getFirstName} ${sender.getLastName} <${sender.getEmail}>"
    val examInfo         = s"${exam.getName} (${exam.getCourse.getName})"
    val linkToInspection = s"$hostName/staff/assessments/${exam.getId}"
    sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender)

  override def composeWeeklySummary(teacher: User): Unit =
    val lang           = getLang(teacher)
    val enrolmentBlock = createEnrolmentBlock(teacher, lang)
    val ungraded       = getReviews(teacher, Seq(Exam.State.REVIEW, Exam.State.REVIEW_STARTED))
    val graded         = getReviews(teacher, Seq(Exam.State.GRADED))
    if enrolmentBlock.nonEmpty || ungraded.nonEmpty || graded.nonEmpty then
      logger.info(s"Sending weekly report to: ${teacher.getEmail}")
      val templatePath = s"${templateRoot}weeklySummary/weeklySummary.html"
      val template     = fileHandler.read(templatePath)
      val subject      = messaging("email.weekly.report.subject")(lang)
      val none         = messaging("email.template.weekly.report.none")(lang)
      val values = Map(
        "enrolment_title"      -> messaging("email.template.weekly.report.enrolments")(lang),
        "enrolment_info_title" -> messaging("email.template.weekly.report.enrolments.info")(lang),
        "enrolment_info"       -> (if enrolmentBlock.isEmpty then none else enrolmentBlock),
        "ungraded_title"       -> messaging("email.template.weekly.report.ungraded")(lang),
        "ungraded_info"        -> messaging("email.template.weekly.report.ungraded.info", ungraded.length)(lang),
        "ungraded_info_own" -> createAssessmentBlock(ungraded, lang).getOrElse(
          none
        ),
        "graded_title"    -> messaging("email.template.weekly.report.graded")(lang),
        "graded_info"     -> messaging("email.template.weekly.report.graded.info", graded.length)(lang),
        "graded_info_own" -> createAssessmentBlock(graded, lang).getOrElse(none)
      )
      val content = replaceAll(template, values)
      emailSender.send(Mail(teacher.getEmail, systemAccount, subject, content))

  override def composeExaminationEventNotification(
      recipient: User,
      enrolment: ExamEnrolment,
      isReminder: Boolean
  ): Unit =
    val templatePath = s"${templateRoot}examinationEventConfirmed.html"
    val template     = fileHandler.read(templatePath)
    val exam         = enrolment.getExam
    val config       = enrolment.getExaminationEventConfiguration
    val lang         = getLang(recipient)
    val subjectTemplate = messaging(
      if (isReminder) "email.examinationEvent.reminder.subject"
      else "email.examinationEvent.subject"
    )(lang)
    val subject      = s"$subjectTemplate: \"${exam.getName}\""
    val courseCode   = Option(exam.getCourse).map(_.getCode).nonNull.map(c => s"(${c.split("_").head})").getOrElse("")
    val examInfo     = s"${exam.getName} $courseCode"
    val teacherName  = getTeachers(exam)
    val startDate    = EmailComposerImpl.DTF.print(new DateTime(config.getExaminationEvent.getStart, timeZone))
    val examDuration = s"${exam.getDuration / 60}h ${exam.getDuration % 60}min"
    val description  = config.getExaminationEvent.getDescription
    val settingsFile =
      if exam.getImplementation == Exam.Implementation.CLIENT_AUTH then
        s"<p>${messaging("email.examinationEvent.file.info")(lang)}</p>"
      else ""
    val stringValues = Map(
      "title"                  -> messaging("email.examinationEvent.title")(lang),
      "exam_info"              -> messaging("email.template.reservation.exam", examInfo)(lang),
      "teacher_name"           -> messaging("email.template.reservation.teacher", teacherName)(lang),
      "event_date"             -> messaging("email.examinationEvent.date", startDate)(lang),
      "exam_duration"          -> messaging("email.template.reservation.exam.duration", examDuration)(lang),
      "description"            -> description,
      "cancellation_info"      -> messaging("email.examinationEvent.cancel.info")(lang),
      "cancellation_link"      -> hostName,
      "cancellation_link_text" -> messaging("email.examinationEvent.cancel.link.text")(lang),
      "settings_file_info"     -> settingsFile
    )
    val content = replaceAll(template, stringValues)
    if exam.getImplementation eq Exam.Implementation.CLIENT_AUTH then
      // Attach a SEB config file
      val quitPassword =
        byodConfigHandler.getPlaintextPassword(config.getEncryptedQuitPassword, config.getQuitPasswordSalt)
      val fileName = exam.getName.replace(" ", "-")
      val file     = File.createTempFile(fileName, ".seb")
      val data = byodConfigHandler.getExamConfig(
        config.getHash,
        config.getEncryptedSettingsPassword,
        config.getSettingsPasswordSalt,
        quitPassword
      )
      Using.resource(new FileOutputStream(file)) { stream =>
        stream.write(data)
      }
      val attachment = new EmailAttachment
      attachment.setPath(file.getAbsolutePath)
      attachment.setDisposition(EmailAttachment.ATTACHMENT)
      attachment.setName(s"$fileName.seb")
      if env.mode eq Mode.Dev then logger.info(s"Wrote SEB config file to ${file.getAbsolutePath}")
      emailSender.send(Mail(recipient.getEmail, systemAccount, subject, content, attachments = Set(attachment)))
    else emailSender.send(Mail(recipient.getEmail, systemAccount, subject, content))

  private def generateExaminationEventCancellationMail(
      exam: Exam,
      event: ExaminationEvent,
      lang: Lang,
      isForced: Boolean
  ) =
    val templatePath = s"${templateRoot}examinationEventCancelled.html"
    val template     = fileHandler.read(templatePath)
    val time         = EmailComposerImpl.DTF.print(adjustDST(event.getStart))
    val teacherName  = getTeachers(exam)
    val courseCode   = Option(exam.getCourse).map(_.getCode).nonNull.map(c => s"(${c.split("_").head})").getOrElse("")
    val examInfo     = s"${exam.getName} $courseCode"
    val msg =
      if isForced then "email.examinationEvent.cancel.message.admin"
      else "email.examinationEvent.cancel.message.student"
    val stringValues = Map(
      "exam"        -> messaging("email.template.reservation.exam", examInfo)(lang),
      "teacher"     -> messaging("email.template.reservation.teacher", teacherName)(lang),
      "time"        -> messaging("email.examinationEvent.date", time)(lang),
      "link"        -> hostName,
      "message"     -> messaging(msg)(lang),
      "new_time"    -> messaging("email.examinationEvent.cancel.message.student.new.time")(lang),
      "description" -> event.getDescription
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
      val subject = messaging("email.examinationEvent.cancel.subject")(lang)
      // email.examinationEvent.cancel.message.admin
      emailSender.send(Mail(user.getEmail, systemAccount, subject, content))
    )

  override def composeExaminationEventCancellationNotification(
      user: User,
      exam: Exam,
      event: ExaminationEvent
  ): Unit =
    val lang    = getLang(user)
    val content = generateExaminationEventCancellationMail(exam, event, lang, false)
    val subject = messaging("email.examinationEvent.cancel.subject")(lang)
    emailSender.send(Mail(user.getEmail, systemAccount, subject, content))

  override def composeReservationNotification(
      recipient: User,
      reservation: Reservation,
      exam: Exam,
      isReminder: Boolean
  ): Unit =
    val templatePath = s"${templateRoot}reservationConfirmed.html"
    val template     = fileHandler.read(templatePath)
    val lang         = getLang(recipient)
    val subjectTemplate =
      if (isReminder) "email.machine.reservation.reminder.subject"
      else "email.machine.reservation.subject"
    val subject    = s"${messaging(subjectTemplate)(lang)} \"${exam.getName}\""
    val courseCode = Option(exam.getCourse).map(_.getCode).nonNull.map(c => s"(${c.split("_").head})").getOrElse("")
    val examInfo   = s"${exam.getName} $courseCode"
    val teacherName =
      if !exam.getExamOwners.isEmpty then getTeachers(exam)
      else s"${exam.getCreator.getFirstName} ${exam.getCreator.getLastName}"
    val startDate       = adjustDST(reservation.getStartAt)
    val endDate         = adjustDST(reservation.getEndAt)
    val reservationDate = s"${EmailComposerImpl.DTF.print(startDate)} - ${EmailComposerImpl.DTF.print(endDate)}"
    val examDuration    = s"${exam.getDuration / 60}h ${exam.getDuration % 60}min"
    val machine         = reservation.getMachine
    val er              = reservation.getExternalReservation
    val machineName     = Option(er).map(_.getMachineName).nonNull.getOrElse(machine.getName)
    val buildingInfo    = Option(er).map(_.getBuildingName).nonNull.getOrElse(machine.getRoom.getBuildingName)
    val roomInstructions =
      if Option(er).isEmpty then Option(machine.getRoom.getRoomInstructions(lang.asJava)).getOrElse("")
      else Option(er.getRoomInstructions(lang.asJava)).getOrElse("")
    val roomName = Option(er).map(_.getRoomName).nonNull.getOrElse(machine.getRoom.getName)

    val stringValues = Map(
      "title"                  -> messaging("email.template.reservation.new")(lang),
      "exam_info"              -> messaging("email.template.reservation.exam", examInfo)(lang),
      "teacher_name"           -> messaging("email.template.reservation.teacher", teacherName)(lang),
      "reservation_date"       -> messaging("email.template.reservation.date", reservationDate)(lang),
      "exam_duration"          -> messaging("email.template.reservation.exam.duration", examDuration)(lang),
      "building_info"          -> messaging("email.template.reservation.building", buildingInfo)(lang),
      "room_name"              -> messaging("email.template.reservation.room", roomName)(lang),
      "machine_name"           -> messaging("email.template.reservation.machine", machineName)(lang),
      "room_instructions"      -> roomInstructions,
      "cancellation_info"      -> messaging("email.template.reservation.cancel.info")(lang),
      "cancellation_link"      -> hostName,
      "cancellation_link_text" -> messaging("email.template.reservation.cancel.link.text")(lang)
    )
    val content = replaceAll(template, stringValues)
    val mail    = Mail(recipient.getEmail, systemAccount, subject, content)
    // Export as iCal format (local reservations only)
    if Option(er).isEmpty then
      val address       = machine.getRoom.getMailAddress
      val addressString = Option(address).map(a => s"${a.getStreet}, ${a.getZip} ${a.getCity}").getOrElse("")
      val iCal =
        createReservationEvent(lang, startDate, endDate, addressString, List(buildingInfo, roomName, machineName))
      val file = File.createTempFile(exam.getName.replace(" ", "-"), ".ics")
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
          attachment.setName(messaging("ical.reservation.filename", ".ics")(lang))
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

    val summary = event.setSummary(messaging("ical.reservation.summary")(lang))
    summary.setLanguage(lang.code)
    event.setDateStart(start.toDate)
    event.setDateEnd(end.toDate)
    event.setLocation(address)
    val roomInfo = placeInfo.mkString(", ")
    event.setDescription(messaging("ical.reservation.room.info", roomInfo)(lang))
    iCal.addEvent(event)
    iCal

  override def composeExamReviewRequest(toUser: User, fromUser: User, exam: Exam, message: String): Unit =
    val templatePath     = s"${templateRoot}reviewRequest.html"
    val template         = fileHandler.read(templatePath)
    val lang             = getLang(toUser)
    val subject          = messaging("email.review.request.subject")(lang)
    val teacherName      = s"${fromUser.getFirstName} ${fromUser.getLastName} <${fromUser.getEmail}>"
    val examInfo         = s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)}"
    val linkToInspection = s"$hostName/staff/exams/${exam.getId}/4"
    val exams            = DB.find(classOf[Exam]).where.eq("parent.id", exam.getId).eq("state", Exam.State.REVIEW).list
    val values = Map(
      "new_reviewer"          -> messaging("email.template.inspector.new", teacherName)(lang),
      "exam_info"             -> examInfo,
      "participation_count"   -> messaging("email.template.participation", exams.length)(lang),
      "inspector_message"     -> messaging("email.template.inspector.message")(lang),
      "exam_link"             -> linkToInspection,
      "exam_link_text"        -> messaging("email.template.link.to.exam")(lang),
      "comment_from_assigner" -> message
    )
    val content = if exams.nonEmpty && exams.length < 6 then
      val list = exams.map(e => s"<li>${e.getCreator.getFirstName} ${e.getCreator.getLastName}</li>").mkString
      replaceAll(template, values + ("student_list" -> s"<ul>$list</ul>)"))
    else replaceAll(template.replace("<p>{{student_list}}</p>", ""), values)
    emailSender.send(Mail(toUser.getEmail, fromUser.getEmail, subject, content))

  private def getTeachersAsText(owners: Set[User]) = owners
    .map(o => s"${o.getFirstName} ${o.getLastName}")
    .mkString(", ")

  override def composeReservationChangeNotification(
      student: User,
      previous: ExamMachine,
      current: ExamMachine,
      enrolment: ExamEnrolment
  ): Unit =
    val template = fileHandler.read(s"${templateRoot}reservationChanged.html")
    val lang     = getLang(student)
    val exam     = enrolment.getExam
    val examInfo = Option(exam)
      .map(e => s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)})")
      .getOrElse(enrolment.getCollaborativeExam.getName)
    val teacherName =
      if !exam.getExamOwners.isEmpty then getTeachers(exam)
      else s"${exam.getCreator.getFirstName} ${exam.getCreator.getLastName}"
    val startDate       = adjustDST(enrolment.getReservation.getStartAt)
    val endDate         = adjustDST(enrolment.getReservation.getEndAt)
    val reservationDate = s"${EmailComposerImpl.DTF.print(startDate)} - ${EmailComposerImpl.DTF.print(endDate)}"
    val examName        = Option(exam).map(_.getName).nonNull.getOrElse(enrolment.getCollaborativeExam.getName)
    val subject         = messaging("email.template.reservation.change.subject", examName)(lang)

    val values = Map(
      "message"             -> messaging("email.template.reservation.change.message")(lang),
      "previousMachine"     -> messaging("email.template.reservation.change.previous")(lang),
      "previousMachineName" -> messaging("email.template.reservation.machine", previous.getName)(lang),
      "previousRoom"        -> messaging("email.template.reservation.room", previous.getRoom.getName)(lang),
      "previousBuilding"    -> messaging("email.template.reservation.building", previous.getRoom.getBuildingName)(lang),
      "currentMachine"      -> messaging("email.template.reservation.change.current")(lang),
      "currentMachineName"  -> messaging("email.template.reservation.machine", current.getName)(lang),
      "currentRoom"         -> messaging("email.template.reservation.room", current.getRoom.getName)(lang),
      "currentBuilding"     -> messaging("email.template.reservation.building", current.getRoom.getBuildingName)(lang),
      "examinationInfo"     -> messaging("email.template.reservation.exam.info")(lang),
      "examInfo"            -> messaging("email.template.reservation.exam", examInfo)(lang),
      "teachers"            -> messaging("email.template.reservation.teacher", teacherName)(lang),
      "reservationTime"     -> messaging("email.template.reservation.date", reservationDate)(lang),
      "cancellationInfo"    -> messaging("email.template.reservation.cancel.info")(lang),
      "cancellationLink"    -> hostName,
      "cancellationLinkText" -> messaging("email.template.reservation.cancel.link.text")(lang)
    )
    val content = replaceAll(template, values)
    emailSender.send(Mail(student.getEmail, systemAccount, subject, content))

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
      "regards"                  -> messaging("email.template.regards")(lang),
      "admin"                    -> messaging("email.template.admin")(lang)
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
    val template     = fileHandler.read(templatePath)
    val subject      = messaging("email.reservation.cancellation.subject")(lang)
    val room =
      Option(reservation.getMachine)
        .map(_.getRoom)
        .nonNull
        .map(_.getName)
        .nonNull
        .getOrElse(reservation.getExternalReservation.getRoomName)
    val info = messaging("email.reservation.cancellation.info")(lang)
    val time = s"${EmailComposerImpl.DTF
        .print(adjustDST(reservation.getStartAt))} - ${EmailComposerImpl.DTF.print(adjustDST(reservation.getEndAt))}"
    val owners = Option(enrolment.getExam.getParent).map(_.getExamOwners).getOrElse(enrolment.getExam.getExamOwners)
    val examName = Option(enrolment.getExam)
      .map(e => s"${e.getName} (${e.getCourse.getCode.split("_")(0)})")
      .getOrElse(enrolment.getCollaborativeExam.getName)
    val stringValues = Map(
      "message"  -> messaging("email.template.reservation.cancel.message.student")(lang),
      "exam"     -> messaging("email.template.reservation.exam", examName)(lang),
      "teacher"  -> messaging("email.template.reservation.teacher", getTeachersAsText(owners.asScala.toSet))(lang),
      "time"     -> messaging("email.template.reservation.date", time)(lang),
      "place"    -> messaging("email.template.reservation.room", room)(lang),
      "new_time" -> messaging("email.template.reservation.cancel.message.student.new.time")(lang),
      "link"     -> hostName
    )
    sendReservationCancellationNotification(stringValues, message, info, lang, email, template, subject)

  private def doComposeReservationAdminCancellationNotification(
      email: String,
      lang: Lang,
      reservation: Reservation,
      message: Option[String],
      examName: String
  ): Unit =
    val templatePath = s"${templateRoot}reservationCanceled.html"
    val template     = fileHandler.read(templatePath)
    val subject      = messaging("email.reservation.cancellation.subject.forced", examName)(lang)
    val date         = EmailComposerImpl.DF.print(adjustDST(reservation.getStartAt))
    val room =
      Option(reservation.getMachine)
        .map(_.getRoom)
        .nonNull
        .map(_.getName)
        .nonNull
        .getOrElse(reservation.getExternalReservation.getRoomName)
    val info = messaging("email.reservation.cancellation.info")(lang)
    val time = EmailComposerImpl.TF.print(adjustDST(reservation.getStartAt))
    val stringValues = Map(
      "message" -> messaging("email.template.reservation.cancel.message", date, time, room)(lang)
    )
    sendReservationCancellationNotification(stringValues, message, info, lang, email, template, subject)

  override def composeExternalReservationCancellationNotification(
      reservation: Reservation,
      message: Option[String]
  ): Unit =
    doComposeReservationAdminCancellationNotification(
      reservation.getExternalUserRef,
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
    val email = student.getEmail
    val lang  = getLang(student)
    if isStudentUser then doComposeReservationSelfCancellationNotification(email, lang, reservation, message, enrolment)
    else
      val examName =
        if (enrolment.getExam != null) enrolment.getExam.getName
        else enrolment.getCollaborativeExam.getName
      doComposeReservationAdminCancellationNotification(email, lang, reservation, message, examName)

  private def getTeachers(exam: Exam) =
    val teachers   = exam.getExamOwners.asScala
    val inspectors = exam.getExamInspections.asScala.map(_.getUser)
    (teachers ++ inspectors).map(u => s"${u.getFirstName} ${u.getLastName} <${u.getEmail}>").mkString(", ")

  override def composePrivateExamParticipantNotification(student: User, fromUser: User, exam: Exam): Unit =
    val templatePath   = s"${templateRoot}participationNotification.html"
    val template       = fileHandler.read(templatePath)
    val lang           = getLang(student)
    val isMaturity     = exam.getExecutionType.getType == ExamExecutionType.Type.MATURITY.toString
    val isAquarium     = exam.getImplementation.toString == Exam.Implementation.AQUARIUM.toString
    val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
    val subject = messaging(
      s"${templatePrefix}participant.notification.subject",
      s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)})"
    )(lang)
    val title = messaging(
      if isAquarium then s"${templatePrefix}participant.notification.title"
      else "email.template.participant.notification.title.examination.event"
    )(lang)
    val examInfo = messaging(
      "email.template.participant.notification.exam",
      s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)})"
    )(lang)
    val teacherName = messaging("email.template.participant.notification.teacher", getTeachers(exam))(lang)
    val events = exam.getExaminationEventConfigurations.asScala.toList
      .map(c => new DateTime(c.getExaminationEvent.getStart, timeZone))
      .sorted
      .map(EmailComposerImpl.DTF.print)
      .mkString(", ")
    val examPeriod =
      if isAquarium then
        messaging(
          "email.template.participant.notification.exam.period",
          s"${EmailComposerImpl.DF.print(new DateTime(exam.getPeriodStart))} - ${EmailComposerImpl.DF
              .print(new DateTime(exam.getPeriodEnd))}"
        )(lang)
      else messaging("email.template.participant.notification.exam.event", s"$events ($timeZone)")(lang)

    val examDuration = messaging("email.template.participant.notification.exam.duration", exam.getDuration)(lang)
    val reservationInfo =
      if isAquarium then ""
      else s"<p>${messaging("email.template.participant.notification.please.reserve")(lang)}</p>"
    val bookingLink =
      if exam.getImplementation == Exam.Implementation.AQUARIUM then s"$hostName/calendar/${exam.getId}"
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
    emailSender.send(Mail(student.getEmail, fromUser.getEmail, subject, content))

  override def composePrivateExamEnded(toUser: User, exam: Exam): Unit =
    val lang           = getLang(toUser)
    val student        = exam.getCreator
    val isMaturity     = exam.getExecutionType.getType == ExamExecutionType.Type.MATURITY.toString
    val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
    val templatePath =
      if exam.getState == Exam.State.ABORTED then s"${templateRoot}examAborted.html"
      else s"${templateRoot}examEnded.html"
    val subject =
      if exam.getState == Exam.State.ABORTED then messaging(templatePrefix + "exam.aborted.subject")(lang)
      else messaging(templatePrefix + "exam.returned.subject")(lang)
    val path = if exam.getState == Exam.State.ABORTED then "aborted" else "returned"
    val msg =
      messaging(
        s"${templatePrefix}exam.$path.message",
        s"${student.getFirstName} ${student.getLastName} <${student.getEmail}>",
        s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)})"
      )(lang)
    val reviewLinkUrl  = s"$hostName/staff/assessments/${exam.getId}"
    val reviewLinkText = messaging("email.template.exam.returned.link")(lang)
    val stringValues = Map(
      "review_link"      -> reviewLinkUrl,
      "review_link_text" -> reviewLinkText,
      "message"          -> msg
    )
    val template = fileHandler.read(templatePath)
    val content  = replaceAll(template, stringValues)
    emailSender.send(Mail(toUser.getEmail, systemAccount, subject, content))

  override def composeNoShowMessage(toUser: User, student: User, exam: Exam): Unit =
    val templatePath   = s"${templateRoot}noShow.html"
    val template       = fileHandler.read(templatePath)
    val lang           = getLang(toUser)
    val isMaturity     = exam.getExecutionType.getType == ExamExecutionType.Type.MATURITY.toString
    val templatePrefix = s"email.template${if isMaturity then ".maturity" else ""}."
    val subject        = messaging(s"${templatePrefix}noshow.subject")(lang)
    val message = messaging(
      "email.template.noshow.message",
      s"${student.getFirstName} ${student.getLastName} <${student.getEmail}>",
      s"${exam.getName} (${exam.getCourse.getCode.split("_")(0)})"
    )(lang)
    val stringValues = Map(
      "message" -> message
    )
    val content = replaceAll(template, stringValues)
    emailSender.send(Mail(toUser.getEmail, systemAccount, subject, content))

  override def composeNoShowMessage(student: User, examName: String, courseCode: String): Unit =
    val templatePath  = s"${templateRoot}noShow.html"
    val template      = fileHandler.read(templatePath)
    val lang          = getLang(student)
    val sanitizedCode = if courseCode.isEmpty then courseCode else s" ($courseCode)"
    val subject       = messaging("email.template.noshow.student.subject")(lang)
    val message       = messaging("email.template.noshow.student.message", examName, sanitizedCode)(lang)
    val stringValues = Map(
      "message" -> message
    )
    val content = replaceAll(template, stringValues)
    emailSender.send(Mail(student.getEmail, systemAccount, subject, content))

  override def composeLanguageInspectionFinishedMessage(
      toUser: User,
      inspector: User,
      inspection: LanguageInspection
  ): Unit =
    val templatePath = s"${templateRoot}languageInspectionReady.html"
    val template     = fileHandler.read(templatePath)
    val lang         = getLang(inspector)
    val exam         = inspection.getExam
    val subject      = messaging("email.template.language.inspection.subject")(lang)
    val studentName =
      s"${exam.getCreator.getFirstName} ${exam.getCreator.getLastName} <${exam.getCreator.getEmail}>"
    val inspectorName = s"${inspector.getFirstName} ${inspector.getLastName} <${inspector.getEmail}>"
    val verdict = messaging(
      if (inspection.getApproved) "email.template.language.inspection.approved"
      else "email.template.language.inspection.rejected"
    )(lang)
    val examInfo         = s"${exam.getName}, ${exam.getCourse.getCode.split("_")(0)}"
    val linkToInspection = s"$hostName/staff/assessments/${inspection.getExam.getId}"
    val stringValues = Map(
      "exam_info"            -> messaging("email.template.reservation.exam", examInfo)(lang),
      "inspector_name"       -> messaging("email.template.reservation.teacher", inspectorName)(lang),
      "student_name"         -> messaging("email.template.language.inspection.student", studentName)(lang),
      "inspection_done"      -> messaging("email.template.language.inspection.done")(lang),
      "statement_title"      -> messaging("email.template.language.inspection.statement.title")(lang),
      "inspection_link_text" -> messaging("email.template.link.to.review")(lang),
      "inspection_info"      -> messaging("email.template.language.inspection.result", verdict)(lang),
      "inspection_link"      -> linkToInspection,
      "inspection_statement" -> inspection.getStatement.getComment
    )
    val content = replaceAll(template, stringValues)
    emailSender.send(Mail(toUser.getEmail, inspector.getEmail, subject, content))

  override def composeCollaborativeExamAnnouncement(emails: Set[String], sender: User, exam: Exam): Unit =
    val templatePath = s"${templateRoot}collaborativeExamNotification.html"
    val template     = fileHandler.read(templatePath)
    val subject      = "New collaborative exam"
    val lang         = Lang.get("en").get
    val examInfo     = exam.getName
    val examPeriod = messaging(
      "email.template.participant.notification.exam.period",
      s"%${EmailComposerImpl.DF.print(new DateTime(exam.getPeriodStart))} - ${EmailComposerImpl.DF
          .print(new DateTime(exam.getPeriodEnd))}"
    )(lang)
    val examDuration = s"${exam.getDuration / 60}h ${exam.getDuration % 60}min"
    val stringValues = Map(
      "exam_info"     -> messaging("email.template.reservation.exam", examInfo)(lang),
      "exam_period"   -> examPeriod,
      "exam_duration" -> messaging("email.template.reservation.exam.duration", examDuration)(lang)
    )
    val content = replaceAll(template, stringValues)
    emailSender.send(Broadcast(emails, sender.getEmail, subject, content, cc = Set(sender.getEmail)))

  private def getEnrolments(exam: Exam) = exam.getExamEnrolments.asScala
    .filter(ee =>
      val reservation = ee.getReservation
      val eec         = ee.getExaminationEventConfiguration
      if Option(reservation).nonEmpty then reservation.getStartAt.isAfterNow
      else if Option(eec).nonEmpty then eec.getExaminationEvent.getStart.isAfterNow
      else false
    )
    .sorted
    .toList

  private def createEnrolmentBlock(teacher: User, lang: Lang) =
    val enrolmentTemplatePath = s"${templateRoot}weeklySummary/enrollmentInfo.html"
    val enrolmentTemplate     = fileHandler.read(enrolmentTemplatePath)
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
      .eq("state", Exam.State.PUBLISHED)
      .gt("periodEnd", new Date)
      .list
      .map(e => (e, getEnrolments(e)))
      .filterNot((_, ees) => ees.isEmpty)
      .map((exam, enrolments) =>
        val commonValues = Map(
          "exam_link"   -> s"$hostName/staff/reservations/${exam.getId}",
          "exam_name"   -> exam.getName,
          "course_code" -> exam.getCourse.getCode.split("_").head
        )
        val subTemplate = if enrolments.isEmpty then
          val noEnrolments = messaging("email.enrolment.no.enrolments")(lang)
          s"<li><a href=\"{{exam_link}}\">{{exam_name}} - {{course_code}}</a>: $noEnrolments</li>"
        else enrolmentTemplate
        val values =
          if enrolments.isEmpty then commonValues
          else
            val first = enrolments.head
            val date =
              if Option(first.getReservation).nonEmpty then adjustDST(first.getReservation.getStartAt)
              else new DateTime(first.getExaminationEventConfiguration.getExaminationEvent.getStart, timeZone)
            commonValues + ("enrolments" ->
              messaging("email.template.enrolment.first", enrolments.length, EmailComposerImpl.DTF.print(date))(lang))

        replaceAll(subTemplate, values)
      )
      .mkString

  // return exams in review state where teacher is either owner or inspector
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
    val template = fileHandler.read(s"${templateRoot}weeklySummary/inspectionInfoSimple.html")
    val values = assessments
      .groupBy(_.getExam.getParent.getId)
      .values
      .filter(_.nonEmpty)
      .map(group => (group.head.getExam.getParent, group.length, group.minBy(_.getDeadline).getDeadline))
      .toSeq
      .sortBy(_._3)
      .map { case (exam, amount, deadline) =>
        val summary =
          messaging("email.weekly.report.review.summary", amount, EmailComposerImpl.DF.print(new DateTime(deadline)))(
            lang
          )
        replaceAll(
          template,
          Map(
            "exam_link"      -> s"$hostName/staff/exams/${exam.getId}/5?collaborative=false",
            "exam_name"      -> exam.getName,
            "course_code"    -> Option(exam.getCourse).map(_.getCode).nonNull.map(_.split("_").head).getOrElse(""),
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
    val code = Option(user.getLanguage).map(_.getCode).nonNull.getOrElse("en")
    Lang.get(code).get

  private def adjustDST(date: DateTime) = {
    val dateTime = new DateTime(date, timeZone)
    if !timeZone.isStandardOffset(date.getMillis) then dateTime.minusHours(1)
    else dateTime
  }
