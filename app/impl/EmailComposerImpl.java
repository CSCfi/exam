/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package impl;

import biweekly.Biweekly;
import biweekly.ICalVersion;
import biweekly.ICalendar;
import biweekly.component.VEvent;
import biweekly.property.Summary;
import com.google.common.collect.Sets;
import io.ebean.DB;
import io.vavr.Tuple2;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Map.Entry;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.annotation.Nonnull;
import javax.inject.Inject;
import models.Course;
import models.Exam;
import models.ExamEnrolment;
import models.ExamExecutionType;
import models.ExamInspection;
import models.ExamMachine;
import models.ExamParticipation;
import models.ExaminationEvent;
import models.ExaminationEventConfiguration;
import models.Language;
import models.LanguageInspection;
import models.MailAddress;
import models.Reservation;
import models.User;
import models.iop.ExternalReservation;
import models.json.CollaborativeExam;
import org.apache.commons.mail.EmailAttachment;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.format.DateTimeFormat;
import org.joda.time.format.DateTimeFormatter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.i18n.Lang;
import play.i18n.MessagesApi;
import util.config.ByodConfigHandler;
import util.config.ConfigReader;
import util.file.FileHandler;

class EmailComposerImpl implements EmailComposer {

    private static final String TAG_OPEN = "{{";
    private static final String TAG_CLOSE = "}}";
    private static final DateTimeFormatter DTF = DateTimeFormat.forPattern("dd.MM.yyyy HH:mm ZZZ");
    private static final DateTimeFormatter DF = DateTimeFormat.forPattern("dd.MM.yyyy");
    private static final DateTimeFormatter TF = DateTimeFormat.forPattern("HH:mm");
    private static final int MINUTES_IN_HOUR = 60;

    private final Logger logger = LoggerFactory.getLogger(EmailComposerImpl.class);

    private final String hostName;
    private final DateTimeZone timeZone;
    private final String baseSystemUrl;
    private final String systemAccount;

    private final EmailSender emailSender;
    private final FileHandler fileHandler;
    private final Environment env;
    private final MessagesApi messaging;
    private final ByodConfigHandler byodConfigHandler;

    @Inject
    EmailComposerImpl(
        EmailSender sender,
        FileHandler fileHandler,
        Environment environment,
        MessagesApi messagesApi,
        ConfigReader configReader,
        ByodConfigHandler byodConfigHandler
    ) {
        emailSender = sender;
        this.fileHandler = fileHandler;
        env = environment;
        messaging = messagesApi;
        hostName = configReader.getHostName();
        timeZone = configReader.getDefaultTimeZone();
        systemAccount = configReader.getSystemAccount();
        baseSystemUrl = configReader.getBaseSystemUrl();
        this.byodConfigHandler = byodConfigHandler;
    }

    private String getTemplatesRoot() {
        return String.format("%s/conf/template/email/", env.rootPath().getAbsolutePath());
    }

    /**
     * This notification is sent to student, when teacher has reviewed the exam
     */
    @Override
    public void composeInspectionReady(User student, User reviewer, Exam exam) {
        String templatePath = getTemplatesRoot() + "reviewReady.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(student);
        String subject = messaging.get(lang, "email.inspection.ready.subject");
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode().split("_")[0]);
        String reviewLink = String.format("%s/participations", hostName);

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("review_done", messaging.get(lang, "email.template.review.ready", examInfo));
        stringValues.put("review_link", reviewLink);
        stringValues.put("review_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("main_system_info", messaging.get(lang, "email.template.main.system.info"));
        stringValues.put("main_system_url", baseSystemUrl);

        if (reviewer == null && exam.getAutoEvaluationConfig() != null) {
            // graded automatically
            stringValues.put("review_autoevaluated", messaging.get(lang, "email.template.review.autoevaluated"));
        } else {
            stringValues.put("review_autoevaluated", null);
        }

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        String senderEmail = reviewer != null ? reviewer.getEmail() : systemAccount;
        emailSender.send(student.getEmail(), senderEmail, subject, template);
    }

    private void sendInspectionMessage(
        String link,
        String teacher,
        String exam,
        String msg,
        User recipient,
        User sender
    ) {
        Lang lang = getLang(recipient);
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("teacher_review_done", messaging.get(lang, "email.template.inspection.done", teacher));
        stringValues.put("inspection_comment_title", messaging.get(lang, "email.template.inspection.comment"));
        stringValues.put("inspection_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("exam_info", exam);
        stringValues.put("inspection_link", link);
        stringValues.put("inspection_comment", msg);

        //Replace template strings
        String templatePath = getTemplatesRoot() + "inspectionReady.html";
        String template = fileHandler.read(templatePath);
        template = replaceAll(template, stringValues);

        String subject = messaging.get(lang, "email.inspection.comment.subject");
        //Send notification
        emailSender.send(recipient.getEmail(), sender.getEmail(), subject, template);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     */
    @Override
    public void composeInspectionMessage(User inspector, User sender, CollaborativeExam ce, Exam exam, String msg) {
        String teacherName = String.format(
            "%s %s <%s>",
            sender.getFirstName(),
            sender.getLastName(),
            sender.getEmail()
        );
        String examInfo = exam.getName();
        String linkToInspection = String.format(
            "%s/staff/assessments/%d/collaborative/%s",
            hostName,
            ce.getId(),
            ce.getRevision()
        );
        sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender);
    }

    /**
     * This notification is sent to the creator of exam when assigned inspector has finished inspection
     */
    @Override
    public void composeInspectionMessage(User inspector, User sender, Exam exam, String msg) {
        String teacherName = String.format(
            "%s %s <%s>",
            sender.getFirstName(),
            sender.getLastName(),
            sender.getEmail()
        );
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getName());
        String linkToInspection = String.format("%s/staff/assessments/%d", hostName, exam.getId());

        sendInspectionMessage(linkToInspection, teacherName, examInfo, msg, inspector, sender);
    }

    private static class ReviewStats implements Comparable<ReviewStats> {

        int amount;
        DateTime earliestDeadLine;

        @Override
        public int compareTo(@Nonnull ReviewStats o) {
            return earliestDeadLine.compareTo(o.earliestDeadLine);
        }
    }

    @Override
    public void composeWeeklySummary(User teacher) {
        Lang lang = getLang(teacher);
        String enrolmentBlock = createEnrolmentBlock(teacher, lang);
        List<ExamParticipation> reviews = getReviews(teacher);
        if (enrolmentBlock.isEmpty() && reviews.isEmpty()) {
            // Nothing useful to send
            return;
        }
        logger.info("Sending weekly report to: {}", teacher.getEmail());
        String templatePath = getTemplatesRoot() + "weeklySummary/weeklySummary.html";
        String inspectionTemplatePath = getTemplatesRoot() + "weeklySummary/inspectionInfoSimple.html";
        String template = fileHandler.read(templatePath);
        String inspectionTemplate = fileHandler.read(inspectionTemplatePath);
        String subject = messaging.get(lang, "email.weekly.report.subject");

        int totalUngradedExams = reviews.size();

        Map<Exam, ReviewStats> examReviewMap = new HashMap<>();
        for (ExamParticipation review : reviews) {
            Exam exam = review.getExam().getParent();
            ReviewStats stats = examReviewMap.get(exam);
            if (stats == null) {
                stats = new ReviewStats();
            }
            stats.amount++;
            if (stats.earliestDeadLine == null || review.getDeadline().isBefore(stats.earliestDeadLine)) {
                stats.earliestDeadLine = review.getDeadline();
            }
            examReviewMap.put(exam, stats);
        }
        SortedSet<Map.Entry<Exam, ReviewStats>> sorted = sortByValue(examReviewMap);
        StringBuilder rowBuilder = new StringBuilder();
        sorted
            .stream()
            .filter(e -> e.getValue().amount > 0)
            .forEach(e -> {
                Map<String, String> stringValues = new HashMap<>();
                stringValues.put("exam_link", String.format("%s/staff/exams/%d/5", hostName, e.getKey().getId()));
                stringValues.put("exam_name", e.getKey().getName());
                Course course = e.getKey().getCourse();
                stringValues.put("course_code", course == null ? "" : course.getCode().split("_")[0]);
                String summary = messaging.get(
                    lang,
                    "email.weekly.report.review.summary",
                    Integer.toString(e.getValue().amount),
                    DF.print(new DateTime(e.getValue().earliestDeadLine))
                );
                stringValues.put("review_summary", summary);
                String row = replaceAll(inspectionTemplate, stringValues);
                rowBuilder.append(row);
            });

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("enrolments_title", messaging.get(lang, "email.template.weekly.report.enrolments"));
        stringValues.put("enrolment_info_title", messaging.get(lang, "email.template.weekly.report.enrolments.info"));
        stringValues.put("enrolment_info", enrolmentBlock.isEmpty() ? "N/A" : enrolmentBlock);
        stringValues.put("inspections_title", messaging.get(lang, "email.template.weekly.report.inspections"));
        stringValues.put(
            "inspections_info",
            messaging.get(lang, "email.template.weekly.report.inspections.info", totalUngradedExams)
        );
        stringValues.put("inspection_info_own", rowBuilder.toString().isEmpty() ? "N/A" : rowBuilder.toString());

        String content = replaceAll(template, stringValues);
        emailSender.send(teacher.getEmail(), systemAccount, subject, content);
    }

    @Override
    public void composeExaminationEventNotification(User recipient, ExamEnrolment enrolment, Boolean isReminder) {
        String templatePath = getTemplatesRoot() + "examinationEventConfirmed.html";
        String template = fileHandler.read(templatePath);
        Exam exam = enrolment.getExam();
        ExaminationEventConfiguration config = enrolment.getExaminationEventConfiguration();
        Lang lang = getLang(recipient);
        String subject = String.format(
            "%s: \"%s\"",
            messaging.get(
                lang,
                isReminder ? "email.examinationEvent.reminder.subject" : "email.examinationEvent.subject"
            ),
            exam.getName()
        );
        String examInfo = String.format(
            "%s %s",
            exam.getName(),
            exam.getCourse() != null ? String.format("(%s)", exam.getCourse().getCode().split("_")[0]) : ""
        );
        String teacherName = getTeachers(exam);
        String startDate = DTF.print(new DateTime(config.getExaminationEvent().getStart(), timeZone));
        String examDuration = String.format(
            "%dh %dmin",
            exam.getDuration() / MINUTES_IN_HOUR,
            exam.getDuration() % MINUTES_IN_HOUR
        );
        String description = config.getExaminationEvent().getDescription();
        String title = messaging.get(lang, "email.examinationEvent.title");

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher_name", messaging.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("event_date", messaging.get(lang, "email.examinationEvent.date", startDate));
        stringValues.put(
            "exam_duration",
            messaging.get(lang, "email.template.reservation.exam.duration", examDuration)
        );
        stringValues.put("description", description);

        stringValues.put("cancellation_info", messaging.get(lang, "email.examinationEvent.cancel.info"));
        stringValues.put("cancellation_link", hostName);
        stringValues.put("cancellation_link_text", messaging.get(lang, "email.examinationEvent.cancel.link.text"));
        stringValues.put(
            "settings_file_info",
            exam.getImplementation() == Exam.Implementation.CLIENT_AUTH
                ? String.format("<p>%s</p>", messaging.get(lang, "email.examinationEvent.file.info"))
                : ""
        );
        String content = replaceAll(template, stringValues);

        if (exam.getImplementation() == Exam.Implementation.CLIENT_AUTH) {
            // Attach a SEB config file
            String quitPassword = byodConfigHandler.getPlaintextPassword(
                config.getEncryptedQuitPassword(),
                config.getQuitPasswordSalt()
            );
            String fileName = exam.getName().replace(" ", "-");
            File file;
            try {
                file = File.createTempFile(fileName, ".seb");
                FileOutputStream fos = new FileOutputStream(file);
                byte[] data = byodConfigHandler.getExamConfig(
                    config.getHash(),
                    config.getEncryptedSettingsPassword(),
                    config.getSettingsPasswordSalt(),
                    quitPassword
                );
                fos.write(data);
                fos.close();
            } catch (Exception e) {
                logger.error("Failed to create a temporary SEB file on disk!");
                throw new RuntimeException(e);
            }
            EmailAttachment attachment = new EmailAttachment();
            attachment.setPath(file.getAbsolutePath());
            attachment.setDisposition(EmailAttachment.ATTACHMENT);
            attachment.setName(fileName + ".seb");
            if (env.isDev()) {
                logger.info("Wrote SEB config file to {}", file.getAbsolutePath());
            }
            emailSender.send(recipient.getEmail(), systemAccount, subject, content, attachment);
        } else {
            emailSender.send(recipient.getEmail(), systemAccount, subject, content);
        }
    }

    private String generateExaminationEventCancellationMail(
        Exam exam,
        ExaminationEvent event,
        Lang lang,
        boolean isForced
    ) {
        String templatePath = getTemplatesRoot() + "examinationEventCancelled.html";
        String template = fileHandler.read(templatePath);

        Map<String, String> stringValues = new HashMap<>();
        String time = DTF.print(adjustDST(event.getStart()));
        String teacherName = getTeachers(exam);
        String examInfo = String.format(
            "%s %s",
            exam.getName(),
            exam.getCourse() != null ? String.format("(%s)", exam.getCourse().getCode().split("_")[0]) : ""
        );

        stringValues.put("exam", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher", messaging.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("time", messaging.get(lang, "email.examinationEvent.date", time));
        stringValues.put("link", hostName);
        stringValues.put(
            "message",
            messaging.get(
                lang,
                isForced
                    ? "email.examinationEvent.cancel.message.admin"
                    : "email.examinationEvent.cancel.message.student"
            )
        );
        stringValues.put("new_time", messaging.get(lang, "email.examinationEvent.cancel.message.student.new.time"));
        stringValues.put("description", event.getDescription());
        return replaceAll(template, stringValues);
    }

    @Override
    public void composeExaminationEventCancellationNotification(Set<User> users, Exam exam, ExaminationEvent event) {
        users.forEach(user -> {
            Lang lang = getLang(user);
            String content = generateExaminationEventCancellationMail(exam, event, lang, true);
            String subject = messaging.get(lang, "email.examinationEvent.cancel.subject");
            // email.examinationEvent.cancel.message.admin
            emailSender.send(user.getEmail(), systemAccount, subject, content);
        });
    }

    public void composeExaminationEventCancellationNotification(User user, Exam exam, ExaminationEvent event) {
        Lang lang = getLang(user);
        String content = generateExaminationEventCancellationMail(exam, event, lang, false);
        String subject = messaging.get(lang, "email.examinationEvent.cancel.subject");
        emailSender.send(user.getEmail(), systemAccount, subject, content);
    }

    @Override
    public void composeReservationNotification(User recipient, Reservation reservation, Exam exam, Boolean isReminder) {
        String templatePath = getTemplatesRoot() + "reservationConfirmed.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(recipient);
        String subject = String.format(
            "%s: \"%s\"",
            messaging.get(
                lang,
                isReminder ? "email.machine.reservation.reminder.subject" : "email.machine.reservation.subject"
            ),
            exam.getName()
        );
        String examInfo = String.format(
            "%s %s",
            exam.getName(),
            exam.getCourse() != null ? String.format("(%s)", exam.getCourse().getCode().split("_")[0]) : ""
        );
        String teacherName;

        if (!exam.getExamOwners().isEmpty()) {
            teacherName = getTeachers(exam);
        } else {
            teacherName = String.format("%s %s", exam.getCreator().getFirstName(), exam.getCreator().getLastName());
        }

        DateTime startDate = adjustDST(reservation.getStartAt());
        DateTime endDate = adjustDST(reservation.getEndAt());
        String reservationDate = DTF.print(startDate) + " - " + DTF.print(endDate);
        String examDuration = String.format(
            "%dh %dmin",
            exam.getDuration() / MINUTES_IN_HOUR,
            exam.getDuration() % MINUTES_IN_HOUR
        );

        ExamMachine machine = reservation.getMachine();
        ExternalReservation er = reservation.getExternalReservation();
        String machineName = forceNotNull(er == null ? machine.getName() : er.getMachineName());
        String buildingInfo = forceNotNull(er == null ? machine.getRoom().getBuildingName() : er.getBuildingName());
        String roomInstructions;
        if (er == null) {
            roomInstructions = forceNotNull(machine.getRoom().getRoomInstructions(lang));
        } else {
            roomInstructions = forceNotNull(er.getRoomInstructions(lang));
        }
        String roomName = forceNotNull(er == null ? machine.getRoom().getName() : er.getRoomName());

        String title = messaging.get(lang, "email.template.reservation.new");

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("teacher_name", messaging.get(lang, "email.template.reservation.teacher", teacherName));
        stringValues.put("reservation_date", messaging.get(lang, "email.template.reservation.date", reservationDate));
        stringValues.put(
            "exam_duration",
            messaging.get(lang, "email.template.reservation.exam.duration", examDuration)
        );
        stringValues.put("building_info", messaging.get(lang, "email.template.reservation.building", buildingInfo));
        stringValues.put("room_name", messaging.get(lang, "email.template.reservation.room", roomName));
        stringValues.put("machine_name", messaging.get(lang, "email.template.reservation.machine", machineName));
        stringValues.put("room_instructions", roomInstructions);
        stringValues.put("cancellation_info", messaging.get(lang, "email.template.reservation.cancel.info"));
        stringValues.put("cancellation_link", hostName);
        stringValues.put("cancellation_link_text", messaging.get(lang, "email.template.reservation.cancel.link.text"));
        String content = replaceAll(template, stringValues);

        List<EmailAttachment> attachments = new ArrayList<>();
        // Export as iCal format (local reservations only)
        if (er == null) {
            MailAddress address = machine.getRoom().getMailAddress();
            String addressString = address == null
                ? null
                : String.format("%s, %s  %s", address.getStreet(), address.getZip(), address.getCity());
            ICalendar iCal = createReservationEvent(
                lang,
                startDate,
                endDate,
                addressString,
                buildingInfo,
                roomName,
                machineName
            );
            File file;
            try {
                file = File.createTempFile(exam.getName().replace(" ", "-"), ".ics");
                Biweekly.write(iCal).go(file);
            } catch (IOException e) {
                logger.error("Failed to create a temporary iCal file on disk!");
                throw new RuntimeException(e);
            }
            EmailAttachment attachment = new EmailAttachment();
            attachment.setPath(file.getAbsolutePath());
            attachment.setDisposition(EmailAttachment.ATTACHMENT);
            attachment.setName(messaging.get(lang, "ical.reservation.filename", ".ics"));
            attachments.add(attachment);
        }
        emailSender.send(
            recipient.getEmail(),
            systemAccount,
            subject,
            content,
            attachments.toArray(EmailAttachment[]::new)
        );
    }

    private ICalendar createReservationEvent(
        Lang lang,
        DateTime start,
        DateTime end,
        String address,
        String... placeInfo
    ) {
        List<String> info = Stream.of(placeInfo).filter(s -> s != null && !s.isEmpty()).toList();
        ICalendar iCal = new ICalendar();
        iCal.setVersion(ICalVersion.V2_0);
        VEvent event = new VEvent();
        Summary summary = event.setSummary(messaging.get(lang, "ical.reservation.summary"));
        summary.setLanguage(lang.code());
        event.setDateStart(start.toDate());
        event.setDateEnd(end.toDate());
        event.setLocation(address);
        event.setDescription(messaging.get(lang, "ical.reservation.room.info", String.join(", ", info)));
        iCal.addEvent(event);
        return iCal;
    }

    @Override
    public void composeExamReviewRequest(User toUser, User fromUser, Exam exam, String message) {
        String templatePath = getTemplatesRoot() + "reviewRequest.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(toUser);
        String subject = messaging.get(lang, "email.review.request.subject");
        String teacherName = String.format(
            "%s %s <%s>",
            fromUser.getFirstName(),
            fromUser.getLastName(),
            fromUser.getEmail()
        );
        String examInfo = String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0]);
        String linkToInspection = String.format("%s/staff/exams/%d/4", hostName, exam.getId());

        Map<String, String> values = new HashMap<>();

        List<Exam> exams = DB.find(Exam.class)
            .where()
            .eq("parent.id", exam.getId())
            .eq("state", Exam.State.REVIEW)
            .findList();

        int uninspectedCount = exams.size();

        if (uninspectedCount > 0 && uninspectedCount < 6) {
            String list = exams
                .stream()
                .map(e -> String.format("<li>%s %s</li>", e.getCreator().getFirstName(), e.getCreator().getLastName()))
                .collect(Collectors.joining());
            values.put("student_list", String.format("<ul>%s</ul>", list));
        } else {
            template = template.replace("<p>{{student_list}}</p>", "");
        }
        values.put("new_reviewer", messaging.get(lang, "email.template.inspector.new", teacherName));
        values.put("exam_info", examInfo);
        values.put("participation_count", messaging.get(lang, "email.template.participation", uninspectedCount));
        values.put("inspector_message", messaging.get(lang, "email.template.inspector.message"));
        values.put("exam_link", linkToInspection);
        values.put("exam_link_text", messaging.get(lang, "email.template.link.to.exam"));
        values.put("comment_from_assigner", message);

        //Replace template strings
        template = replaceAll(template, values);
        emailSender.send(toUser.getEmail(), fromUser.getEmail(), subject, template);
    }

    private String getTeachersAsText(Set<User> owners) {
        return owners
            .stream()
            .map(eo -> String.format("%s %s", eo.getFirstName(), eo.getLastName()))
            .collect(Collectors.joining(", "));
    }

    @Override
    public void composeReservationChangeNotification(
        User student,
        ExamMachine previous,
        ExamMachine current,
        ExamEnrolment enrolment
    ) {
        String template = fileHandler.read(getTemplatesRoot() + "reservationChanged.html");
        Lang lang = getLang(student);
        Exam exam = enrolment.getExam();

        String examInfo = exam != null
            ? String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
            : enrolment.getCollaborativeExam().getName();

        String teacherName = "";
        if (exam != null) {
            if (!exam.getExamOwners().isEmpty()) {
                teacherName = getTeachers(exam);
            } else {
                teacherName = String.format("%s %s", exam.getCreator().getFirstName(), exam.getCreator().getLastName());
            }
        }

        DateTime startDate = adjustDST(enrolment.getReservation().getStartAt());
        DateTime endDate = adjustDST(enrolment.getReservation().getEndAt());
        String reservationDate = DTF.print(startDate) + " - " + DTF.print(endDate);

        Map<String, String> values = new HashMap<>();
        String subject = messaging.get(
            lang,
            "email.template.reservation.change.subject",
            exam != null ? enrolment.getExam().getName() : enrolment.getCollaborativeExam().getName()
        );
        values.put("message", messaging.get(lang, "email.template.reservation.change.message"));
        values.put("previousMachine", messaging.get(lang, "email.template.reservation.change.previous"));
        values.put(
            "previousMachineName",
            messaging.get(lang, "email.template.reservation.machine", previous.getName())
        );
        values.put(
            "previousRoom",
            messaging.get(lang, "email.template.reservation.room", previous.getRoom().getName())
        );
        values.put(
            "previousBuilding",
            messaging.get(lang, "email.template.reservation.building", previous.getRoom().getBuildingName())
        );
        values.put("currentMachine", messaging.get(lang, "email.template.reservation.change.current"));
        values.put("currentMachineName", messaging.get(lang, "email.template.reservation.machine", current.getName()));
        values.put("currentRoom", messaging.get(lang, "email.template.reservation.room", current.getRoom().getName()));
        values.put(
            "currentBuilding",
            messaging.get(lang, "email.template.reservation.building", current.getRoom().getBuildingName())
        );
        values.put("examinationInfo", messaging.get(lang, "email.template.reservation.exam.info"));
        values.put("examInfo", messaging.get(lang, "email.template.reservation.exam", examInfo));
        values.put("teachers", messaging.get(lang, "email.template.reservation.teacher", teacherName));
        values.put("reservationTime", messaging.get(lang, "email.template.reservation.date", reservationDate));
        values.put("cancellationInfo", messaging.get(lang, "email.template.reservation.cancel.info"));
        values.put("cancellationLink", hostName);
        values.put("cancellationLinkText", messaging.get(lang, "email.template.reservation.cancel.link.text"));

        String content = replaceAll(template, values);
        emailSender.send(student.getEmail(), systemAccount, subject, content);
    }

    private void sendReservationCancellationNotification(
        Map<String, String> values,
        String message,
        String info,
        Lang lang,
        String email,
        String template,
        String subject
    ) {
        values.put("cancellation_information", message == null ? "" : String.format("%s:<br />%s", info, message));
        values.put("regards", messaging.get(lang, "email.template.regards"));
        values.put("admin", messaging.get(lang, "email.template.admin"));

        String content = replaceAll(template, values);
        emailSender.send(email, systemAccount, subject, content);
    }

    private void doComposeReservationSelfCancellationNotification(
        String email,
        Lang lang,
        Reservation reservation,
        String message,
        ExamEnrolment enrolment
    ) {
        String templatePath = getTemplatesRoot() + "reservationCanceledByStudent.html";
        String template = fileHandler.read(templatePath);
        String subject = messaging.get(lang, "email.reservation.cancellation.subject");
        String room = reservation.getMachine() != null
            ? reservation.getMachine().getRoom().getName()
            : reservation.getExternalReservation().getRoomName();
        String info = messaging.get(lang, "email.reservation.cancellation.info");

        Map<String, String> stringValues = new HashMap<>();
        String time = String.format(
            "%s - %s",
            DTF.print(adjustDST(reservation.getStartAt())),
            DTF.print(adjustDST(reservation.getEndAt()))
        );
        final Set<User> owners = enrolment.getExam().getParent() != null
            ? enrolment.getExam().getParent().getExamOwners()
            : enrolment.getExam().getExamOwners();
        stringValues.put("message", messaging.get(lang, "email.template.reservation.cancel.message.student"));

        final String examName = enrolment.getExam() != null
            ? enrolment.getExam().getName() + " (" + enrolment.getExam().getCourse().getCode().split("_")[0] + ")"
            : enrolment.getCollaborativeExam().getName();
        stringValues.put("exam", messaging.get(lang, "email.template.reservation.exam", examName));
        stringValues.put(
            "teacher",
            messaging.get(lang, "email.template.reservation.teacher", getTeachersAsText(owners))
        );
        stringValues.put("time", messaging.get(lang, "email.template.reservation.date", time));
        stringValues.put("place", messaging.get(lang, "email.template.reservation.room", room));
        stringValues.put("new_time", messaging.get(lang, "email.template.reservation.cancel.message.student.new.time"));
        stringValues.put("link", hostName);
        sendReservationCancellationNotification(stringValues, message, info, lang, email, template, subject);
    }

    private void doComposeReservationAdminCancellationNotification(
        String email,
        Lang lang,
        Reservation reservation,
        String message,
        String examName
    ) {
        String templatePath = getTemplatesRoot() + "reservationCanceled.html";

        String template = fileHandler.read(templatePath);
        String subject = messaging.get(lang, "email.reservation.cancellation.subject.forced", examName);

        String date = DF.print(adjustDST(reservation.getStartAt()));
        String room = reservation.getMachine() != null
            ? reservation.getMachine().getRoom().getName()
            : reservation.getExternalReservation().getRoomName();
        String info = messaging.get(lang, "email.reservation.cancellation.info");

        Map<String, String> stringValues = new HashMap<>();
        String time = TF.print(adjustDST(reservation.getStartAt()));
        stringValues.put("message", messaging.get(lang, "email.template.reservation.cancel.message", date, time, room));

        sendReservationCancellationNotification(stringValues, message, info, lang, email, template, subject);
    }

    @Override
    public void composeExternalReservationCancellationNotification(Reservation reservation, String message) {
        doComposeReservationAdminCancellationNotification(
            reservation.getExternalUserRef(),
            Lang.forCode("en"),
            reservation,
            message,
            "externally managed exam"
        );
    }

    @Override
    public void composeReservationCancellationNotification(
        User student,
        Reservation reservation,
        String message,
        Boolean isStudentUser,
        ExamEnrolment enrolment
    ) {
        String email = student.getEmail();
        Lang lang = getLang(student);
        if (isStudentUser) {
            doComposeReservationSelfCancellationNotification(email, lang, reservation, message, enrolment);
        } else {
            String examName = enrolment.getExam() != null
                ? enrolment.getExam().getName()
                : enrolment.getCollaborativeExam().getName();
            doComposeReservationAdminCancellationNotification(email, lang, reservation, message, examName);
        }
    }

    private static String getTeachers(Exam exam) {
        Set<User> teachers = new HashSet<>(exam.getExamOwners());
        teachers.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        return teachers
            .stream()
            .map(t -> String.format("%s %s <%s>", t.getFirstName(), t.getLastName(), t.getEmail()))
            .collect(Collectors.joining(", "));
    }

    @Override
    public void composePrivateExamParticipantNotification(User student, User fromUser, Exam exam) {
        String templatePath = getTemplatesRoot() + "participationNotification.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(student);

        boolean isMaturity = exam.getExecutionType().getType().equals(ExamExecutionType.Type.MATURITY.toString());
        boolean isAquarium = exam.getImplementation().toString().equals(Exam.Implementation.AQUARIUM.toString());
        String templatePrefix = String.format("email.template%s.", isMaturity ? ".maturity" : "");

        String subject = messaging.get(
            lang,
            templatePrefix + "participant.notification.subject",
            String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
        );
        String title = messaging.get(
            lang,
            isAquarium
                ? templatePrefix + "participant.notification.title"
                : "email.template.participant.notification.title.examination.event"
        );

        String examInfo = messaging.get(
            lang,
            "email.template.participant.notification.exam",
            String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
        );
        String teacherName = messaging.get(lang, "email.template.participant.notification.teacher", getTeachers(exam));
        String events = exam
            .getExaminationEventConfigurations()
            .stream()
            .map(c -> new DateTime(c.getExaminationEvent().getStart(), timeZone))
            .sorted()
            .map(DTF::print)
            .collect(Collectors.joining(", "));
        String examPeriod = isAquarium
            ? messaging.get(
                lang,
                "email.template.participant.notification.exam.period",
                String.format("%s - %s", DF.print(exam.getPeriodStart()), DF.print(exam.getPeriodEnd()))
            )
            : messaging.get(lang, "email.template.participant.notification.exam.event", events);
        String examDuration = messaging.get(
            lang,
            "email.template.participant.notification.exam.duration",
            exam.getDuration()
        );
        String reservationInfo = isAquarium
            ? ""
            : String.format("<p>%s</p>", messaging.get(lang, "email.template.participant.notification.please.reserve"));
        String bookingLink = exam.getImplementation() == Exam.Implementation.AQUARIUM
            ? String.format("%s/calendar/%d", hostName, exam.getId())
            : hostName;
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("title", title);
        stringValues.put("exam_info", examInfo);
        stringValues.put("teacher_name", teacherName);
        stringValues.put("exam_period", examPeriod);
        stringValues.put("exam_duration", examDuration);
        stringValues.put("reservation_info", reservationInfo);
        stringValues.put("booking_link", bookingLink);
        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), fromUser.getEmail(), subject, content);
    }

    @Override
    public void composePrivateExamEnded(User toUser, Exam exam) {
        Lang lang = getLang(toUser);
        User student = exam.getCreator();
        String templatePath, subject, message;
        boolean isMaturity = exam.getExecutionType().getType().equals(ExamExecutionType.Type.MATURITY.toString());
        String templatePrefix = String.format("email.template%s.", isMaturity ? ".maturity" : "");
        Map<String, String> stringValues = new HashMap<>();
        if (exam.getState() == Exam.State.ABORTED) {
            templatePath = getTemplatesRoot() + "examAborted.html";
            subject = messaging.get(lang, templatePrefix + "exam.aborted.subject");
            message = messaging.get(
                lang,
                templatePrefix + "exam.aborted.message",
                String.format("%s %s <%s>", student.getFirstName(), student.getLastName(), student.getEmail()),
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
            );
        } else {
            templatePath = getTemplatesRoot() + "examEnded.html";
            subject = messaging.get(lang, templatePrefix + "exam.returned.subject");
            message = messaging.get(
                lang,
                templatePrefix + "exam.returned.message",
                String.format("%s %s <%s>", student.getFirstName(), student.getLastName(), student.getEmail()),
                String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
            );
            String reviewLinkUrl = String.format("%s/staff/assessments/%d", hostName, exam.getId());
            String reviewLinkText = messaging.get(lang, "email.template.exam.returned.link");
            stringValues.put("review_link", reviewLinkUrl);
            stringValues.put("review_link_text", reviewLinkText);
        }
        stringValues.put("message", message);
        String template = fileHandler.read(templatePath);
        String content = replaceAll(template, stringValues);
        emailSender.send(toUser.getEmail(), systemAccount, subject, content);
    }

    @Override
    public void composeNoShowMessage(User toUser, User student, Exam exam) {
        String templatePath = getTemplatesRoot() + "noShow.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(toUser);
        boolean isMaturity = exam.getExecutionType().getType().equals(ExamExecutionType.Type.MATURITY.toString());
        String templatePrefix = String.format("email.template%s.", isMaturity ? ".maturity" : "");
        String subject = messaging.get(lang, templatePrefix + "noshow.subject");
        String message = messaging.get(
            lang,
            "email.template.noshow.message",
            String.format("%s %s <%s>", student.getFirstName(), student.getLastName(), student.getEmail()),
            String.format("%s (%s)", exam.getName(), exam.getCourse().getCode().split("_")[0])
        );
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("message", message);
        String content = replaceAll(template, stringValues);
        emailSender.send(toUser.getEmail(), systemAccount, subject, content);
    }

    @Override
    public void composeNoShowMessage(User student, String examName, String courseCode) {
        String templatePath = getTemplatesRoot() + "noShow.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(student);
        String sanitizedCode = courseCode.isEmpty() ? courseCode : String.format(" (%s)", courseCode);
        String subject = messaging.get(lang, "email.template.noshow.student.subject");
        String message = messaging.get(lang, "email.template.noshow.student.message", examName, sanitizedCode);
        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("message", message);
        String content = replaceAll(template, stringValues);
        emailSender.send(student.getEmail(), systemAccount, subject, content);
    }

    @Override
    public void composeLanguageInspectionFinishedMessage(User toUser, User inspector, LanguageInspection inspection) {
        String templatePath = getTemplatesRoot() + "languageInspectionReady.html";
        String template = fileHandler.read(templatePath);
        Lang lang = getLang(inspector);

        Exam exam = inspection.getExam();
        String subject = messaging.get(lang, "email.template.language.inspection.subject");
        String inspectorName = String.format(
            "%s %s <%s>",
            inspector.getFirstName(),
            inspector.getLastName(),
            inspector.getEmail()
        );
        String studentName = String.format(
            "%s %s <%s>",
            exam.getCreator().getFirstName(),
            exam.getCreator().getLastName(),
            exam.getCreator().getEmail()
        );
        String verdict = messaging.get(
            lang,
            inspection.getApproved()
                ? "email.template.language.inspection.approved"
                : "email.template.language.inspection.rejected"
        );
        String examInfo = String.format("%s, %s", exam.getName(), exam.getCourse().getCode().split("_")[0]);

        String linkToInspection = String.format("%s/staff/assessments/%d", hostName, inspection.getExam().getId());

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("inspector_name", messaging.get(lang, "email.template.reservation.teacher", inspectorName));
        stringValues.put(
            "student_name",
            messaging.get(lang, "email.template.language.inspection.student", studentName)
        );
        stringValues.put("inspection_done", messaging.get(lang, "email.template.language.inspection.done"));
        stringValues.put("statement_title", messaging.get(lang, "email.template.language.inspection.statement.title"));
        stringValues.put("inspection_link_text", messaging.get(lang, "email.template.link.to.review"));
        stringValues.put("inspection_info", messaging.get(lang, "email.template.language.inspection.result", verdict));
        stringValues.put("inspection_link", linkToInspection);
        stringValues.put("inspection_statement", inspection.getStatement().getComment());
        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        emailSender.send(toUser.getEmail(), inspector.getEmail(), subject, template);
    }

    @Override
    public void composeCollaborativeExamAnnouncement(Set<String> emails, User sender, Exam exam) {
        String templatePath = getTemplatesRoot() + "collaborativeExamNotification.html";
        String template = fileHandler.read(templatePath);
        String subject = "New collaborative exam";
        Lang lang = Lang.forCode("en");
        String examInfo = exam.getName();
        String examPeriod = messaging.get(
            lang,
            "email.template.participant.notification.exam.period",
            String.format(
                "%s - %s",
                DF.print(new DateTime(exam.getPeriodStart())),
                DF.print(new DateTime(exam.getPeriodEnd()))
            )
        );
        String examDuration = String.format(
            "%dh %dmin",
            exam.getDuration() / MINUTES_IN_HOUR,
            exam.getDuration() % MINUTES_IN_HOUR
        );

        Map<String, String> stringValues = new HashMap<>();
        stringValues.put("exam_info", messaging.get(lang, "email.template.reservation.exam", examInfo));
        stringValues.put("exam_period", examPeriod);
        stringValues.put(
            "exam_duration",
            messaging.get(lang, "email.template.reservation.exam.duration", examDuration)
        );

        //Replace template strings
        template = replaceAll(template, stringValues);

        //Send notification
        emailSender.send(emails, sender.getEmail(), Sets.newHashSet(sender.getEmail()), subject, template);
    }

    private List<ExamEnrolment> getEnrolments(Exam exam) {
        return exam
            .getExamEnrolments()
            .stream()
            .filter(ee -> {
                Reservation reservation = ee.getReservation();
                ExaminationEventConfiguration eec = ee.getExaminationEventConfiguration();
                if (reservation != null) {
                    return reservation.getStartAt().isAfter(DateTime.now());
                } else if (eec != null) {
                    return eec.getExaminationEvent().getStart().isAfter(DateTime.now());
                }
                return false;
            })
            .sorted()
            .toList();
    }

    private String createEnrolmentBlock(User teacher, Lang lang) {
        String enrolmentTemplatePath = getTemplatesRoot() + "weeklySummary/enrollmentInfo.html";
        String enrolmentTemplate = fileHandler.read(enrolmentTemplatePath);
        List<Exam> exams = DB.find(Exam.class)
            .fetch("course")
            .fetch("examEnrolments")
            .fetch("examEnrolments.reservation")
            .fetch("examEnrolments.examinationEventConfiguration.examinationEvent")
            .where()
            .disjunction()
            .eq("examOwners", teacher)
            .eq("examInspections.user", teacher)
            .endJunction()
            .isNotNull("course")
            .eq("state", Exam.State.PUBLISHED)
            .gt("periodEnd", new Date())
            .findList();

        return exams
            .stream()
            .map(e -> new Tuple2<>(e, getEnrolments(e)))
            .filter(t -> !t._1.isPrivate() || !t._2.isEmpty())
            .map(t -> {
                Map<String, String> stringValues = new HashMap<>();
                stringValues.put("exam_link", String.format("%s/staff/reservations/%d", hostName, t._1.getId()));
                stringValues.put("exam_name", t._1.getName());
                stringValues.put("course_code", t._1.getCourse().getCode().split("_")[0]);
                String subTemplate;
                if (t._2.isEmpty()) {
                    String noEnrolments = messaging.get(lang, "email.enrolment.no.enrolments");
                    subTemplate = String.format(
                        "<li><a href=\"{{exam_link}}\">{{exam_name}} - {{course_code}}</a>: %s</li>",
                        noEnrolments
                    );
                } else {
                    ExamEnrolment first = t._2.getFirst();
                    DateTime date = first.getReservation() != null
                        ? adjustDST(first.getReservation().getStartAt())
                        : new DateTime(
                            first.getExaminationEventConfiguration().getExaminationEvent().getStart(),
                            timeZone
                        );
                    stringValues.put(
                        "enrolments",
                        messaging.get(lang, "email.template.enrolment.first", t._2.size(), DTF.print(date))
                    );
                    subTemplate = enrolmentTemplate;
                }
                return replaceAll(subTemplate, stringValues);
            })
            .collect(Collectors.joining());
    }

    // return exams in review state where teacher is either owner or inspector
    private static List<ExamParticipation> getReviews(User teacher) {
        return DB.find(ExamParticipation.class)
            .fetch("exam.course")
            .where()
            .disjunction()
            .eq("exam.parent.examOwners", teacher)
            .eq("exam.examInspections.user", teacher)
            .endJunction()
            .disjunction()
            .eq("exam.state", Exam.State.REVIEW)
            .eq("exam.state", Exam.State.REVIEW_STARTED)
            .endJunction()
            .findList();
    }

    private static <K, V extends Comparable<? super V>> SortedSet<Map.Entry<K, V>> sortByValue(Map<K, V> map) {
        SortedSet<Map.Entry<K, V>> set = new TreeSet<>((e1, e2) -> {
            int res = e1.getValue().compareTo(e2.getValue());
            return res != 0 ? res : 1;
        });
        set.addAll(map.entrySet());
        return set;
    }

    private static String replaceAll(String original, Map<String, String> stringValues) {
        String result = original;
        for (Entry<String, String> entry : stringValues.entrySet()) {
            if (result.contains(entry.getKey())) {
                String value = entry.getValue();
                result = result.replace(TAG_OPEN + entry.getKey() + TAG_CLOSE, value == null ? "" : value);
            }
        }
        return result;
    }

    private static String forceNotNull(String src) {
        return src == null ? "" : src;
    }

    private static Lang getLang(User user) {
        Language userLang = user.getLanguage();
        return Lang.forCode(userLang == null ? "en" : userLang.getCode());
    }

    private DateTime adjustDST(DateTime date) {
        DateTime dateTime = new DateTime(date, timeZone);
        if (!timeZone.isStandardOffset(date.getMillis())) {
            dateTime = dateTime.minusHours(1);
        }
        return dateTime;
    }
}
