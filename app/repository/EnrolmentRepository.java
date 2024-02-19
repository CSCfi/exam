package repository;

import io.ebean.DB;
import io.ebean.Database;
import io.ebean.ExpressionList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamMachine;
import models.ExamRoom;
import models.ExaminationEvent;
import models.ExaminationEventConfiguration;
import models.Reservation;
import models.Role;
import models.User;
import models.json.CollaborativeExam;
import models.sections.ExamSection;
import org.apache.commons.codec.binary.Base64;
import org.joda.time.DateTime;
import org.joda.time.DateTimeZone;
import org.joda.time.Minutes;
import org.joda.time.format.ISODateTimeFormat;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import play.Environment;
import play.mvc.Http;
import play.mvc.Result;
import util.config.ByodConfigHandler;
import util.datetime.DateTimeHandler;

public class EnrolmentRepository {

    private final Environment environment;
    private final DatabaseExecutionContext ec;
    private final ByodConfigHandler byodConfigHandler;
    private final DateTimeHandler dateTimeHandler;
    private final Database db;

    private final Logger logger = LoggerFactory.getLogger(EnrolmentRepository.class);

    @Inject
    public EnrolmentRepository(
        Environment environment,
        DatabaseExecutionContext databaseExecutionContext,
        ByodConfigHandler byodConfigHandler,
        DateTimeHandler dateTimeHandler
    ) {
        this.environment = environment;
        this.db = DB.getDefault();
        this.ec = databaseExecutionContext;
        this.byodConfigHandler = byodConfigHandler;
        this.dateTimeHandler = dateTimeHandler;
    }

    public CompletionStage<Map<String, String>> getReservationHeaders(Http.Request request, Long userId) {
        return CompletableFuture.supplyAsync(() -> doGetReservationHeaders(request, userId), ec);
    }

    public CompletionStage<List<ExamEnrolment>> getStudentEnrolments(User user) {
        return CompletableFuture.supplyAsync(() -> doGetStudentEnrolments(user), ec);
    }

    public CompletionStage<ExamRoom> getRoomInfoForEnrolment(String hash, User user) {
        return CompletableFuture.supplyAsync(
            () -> {
                ExpressionList<ExamEnrolment> query = DB
                    .find(ExamEnrolment.class)
                    .fetch("user", "id")
                    .fetch("user.language")
                    .fetch("reservation.machine.room", "roomInstruction, roomInstructionEN, roomInstructionSV")
                    .where()
                    .disjunction()
                    .eq("exam.hash", hash)
                    .eq("externalExam.hash", hash)
                    .endJunction()
                    .isNotNull("reservation.machine.room");
                if (user.hasRole(Role.Name.STUDENT)) {
                    query = query.eq("user", user);
                }
                ExamEnrolment enrolment = query.findOne();
                return enrolment == null ? null : enrolment.getReservation().getMachine().getRoom();
            },
            ec.current()
        );
    }

    private List<ExamEnrolment> doGetStudentEnrolments(User user) {
        DateTime now = dateTimeHandler.adjustDST(new DateTime());
        List<ExamEnrolment> enrolments = DB
            .find(ExamEnrolment.class)
            .fetch("examinationEventConfiguration")
            .fetch("examinationEventConfiguration.examinationEvent")
            .fetch("collaborativeExam")
            .fetch("exam")
            .fetch("exam.examinationEventConfigurations.examinationEvent")
            .fetch("exam.executionType")
            .fetch("exam.examSections", "name, description, optional")
            .fetch("exam.course", "name, code")
            .fetch("exam.examLanguages")
            .fetch("exam.examOwners", "firstName, lastName")
            .fetch("exam.examInspections.user", "firstName, lastName")
            .fetch("reservation", "startAt, endAt, externalRef")
            .fetch("reservation.externalReservation")
            .fetch("reservation.externalReservation.mailAddress")
            .fetch("optionalSections")
            .fetch("optionalSections.examMaterials")
            .fetch("reservation.machine", "name")
            .fetch(
                "reservation.machine.room",
                "name, roomCode, localTimezone, " + "roomInstruction, roomInstructionEN, roomInstructionSV"
            )
            .where()
            .eq("user", user)
            .disjunction()
            .gt("reservation.endAt", now.toDate())
            .isNull("reservation")
            .endJunction()
            .findList()
            .stream()
            .filter(ee -> {
                if (ee.getExaminationEventConfiguration() == null) {
                    return true;
                }
                var start = ee.getExaminationEventConfiguration().getExaminationEvent().getStart();
                return start.plusMinutes(ee.getExam().getDuration()).isAfter(now);
            })
            .toList();
        enrolments.forEach(ee -> {
            Exam exam = ee.getExam();
            if (exam != null && exam.getExamSections().stream().noneMatch(ExamSection::isOptional)) {
                // Hide section info if no optional sections exist
                exam.getExamSections().clear();
            }
        });
        return enrolments
            .stream()
            .filter(ee -> {
                Exam exam = ee.getExam();
                if (exam != null && exam.getPeriodEnd() != null) {
                    return (
                        exam.getPeriodEnd().isAfterNow() &&
                        exam.hasState(Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED)
                    );
                }
                CollaborativeExam ce = ee.getCollaborativeExam();
                return ce != null && ce.getPeriodEnd().isAfterNow();
            })
            .toList();
    }

    private Map<String, String> doGetReservationHeaders(Http.RequestHeader request, Long userId) {
        Map<String, String> headers = new HashMap<>();
        Optional<ExamEnrolment> ongoingEnrolment = getNextEnrolment(userId, 0);
        if (ongoingEnrolment.isPresent()) {
            handleOngoingEnrolment(ongoingEnrolment.get(), request, headers);
        } else {
            DateTime now = new DateTime();
            int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
            Optional<ExamEnrolment> upcomingEnrolment = getNextEnrolment(userId, lookAheadMinutes);
            if (upcomingEnrolment.isPresent()) {
                handleUpcomingEnrolment(upcomingEnrolment.get(), request, headers);
            } else if (isOnExamMachine(request)) {
                // User is logged on an exam machine but has no exams for today
                headers.put("x-exam-upcoming-exam", "none");
            }
        }
        return headers;
    }

    private boolean isOnExamMachine(Http.RequestHeader request) {
        return db.find(ExamMachine.class).where().eq("ipAddress", request.remoteAddress()).findOneOrEmpty().isPresent();
    }

    private boolean isMachineOk(ExamEnrolment enrolment, Http.RequestHeader request, Map<String, String> headers) {
        boolean requiresReservation =
            enrolment.getExternalExam() != null ||
            enrolment.getCollaborativeExam() != null ||
            (enrolment.getExam() != null && enrolment.getExam().getImplementation() == Exam.Implementation.AQUARIUM);
        // Loose the checks for dev usage to facilitate for easier testing
        if (environment.isDev() && requiresReservation) {
            return true;
        }
        boolean requiresClientAuth =
            enrolment.getExam() != null && enrolment.getExam().getImplementation() == Exam.Implementation.CLIENT_AUTH;

        if (requiresClientAuth) {
            // SEB examination
            ExaminationEventConfiguration config = enrolment.getExaminationEventConfiguration();
            Optional<Result> error = byodConfigHandler.checkUserAgent(request, config.getConfigKey());
            if (error.isPresent()) {
                String msg = ISODateTimeFormat.dateTime().print(new DateTime(config.getExaminationEvent().getStart()));
                headers.put("x-exam-wrong-agent-config", msg);
                return false;
            }
        } else if (requiresReservation) {
            // Aquarium examination
            ExamMachine examMachine = enrolment.getReservation().getMachine();
            ExamRoom room = examMachine.getRoom();
            String machineIp = examMachine.getIpAddress();
            String remoteIp = request.remoteAddress();
            logger.debug("User is on IP: {} <-> Should be on IP: {}", remoteIp, machineIp);
            if (!remoteIp.equals(machineIp)) {
                String message;
                String header;

                // Is this a known machine?
                ExamMachine lookedUp = db.find(ExamMachine.class).where().eq("ipAddress", remoteIp).findOne();
                if (lookedUp == null) {
                    // IP not known
                    header = "x-exam-unknown-machine";
                    DateTimeZone zone = DateTimeZone.forID(room.getLocalTimezone());
                    String start = ISODateTimeFormat
                        .dateTime()
                        .withZone(zone)
                        .print(new DateTime(enrolment.getReservation().getStartAt()));
                    message =
                        String.format(
                            "%s:::%s:::%s:::%s:::%s:::%s",
                            room.getCampus(),
                            room.getBuildingName(),
                            room.getRoomCode(),
                            examMachine.getName(),
                            start,
                            zone.getID()
                        );
                } else if (lookedUp.getRoom().getId().equals(room.getId())) {
                    // Right room, wrong machine
                    header = "x-exam-wrong-machine";
                    message = enrolment.getId() + ":::" + lookedUp.getId();
                } else {
                    // Wrong room
                    header = "x-exam-wrong-room";
                    message = enrolment.getId() + ":::" + lookedUp.getId();
                }
                headers.put(header, Base64.encodeBase64String(message.getBytes()));
                logger.debug("room and machine not ok. " + message);
                return false;
            }
        }
        return true;
    }

    private String getExamHash(ExamEnrolment enrolment) {
        if (enrolment.getExternalExam() != null) {
            return enrolment.getExternalExam().getHash();
        } else if (enrolment.getCollaborativeExam() != null && enrolment.getExam() == null) {
            return enrolment.getCollaborativeExam().getHash();
        } else {
            return enrolment.getExam().getHash();
        }
    }

    private void handleOngoingEnrolment(
        ExamEnrolment enrolment,
        Http.RequestHeader request,
        Map<String, String> headers
    ) {
        if (isMachineOk(enrolment, request, headers)) {
            String hash = getExamHash(enrolment);
            headers.put("x-exam-start-exam", hash);
        }
    }

    private void handleUpcomingEnrolment(
        ExamEnrolment enrolment,
        Http.RequestHeader request,
        Map<String, String> headers
    ) {
        if (enrolment.getExam() != null && enrolment.getExam().getImplementation() == Exam.Implementation.WHATEVER) {
            // Home exam, don't set headers unless it starts in 5 minutes
            DateTime threshold = DateTime.now().plusMinutes(5);
            DateTime start = enrolment.getExaminationEventConfiguration().getExaminationEvent().getStart();
            if (start.isBefore(threshold)) {
                headers.put(
                    "x-exam-upcoming-exam",
                    String.format("%s:::%d", getExamHash(enrolment), enrolment.getId())
                );
            }
        } else if (isMachineOk(enrolment, request, headers)) {
            if (
                enrolment.getExam() != null && enrolment.getExam().getImplementation() == Exam.Implementation.AQUARIUM
            ) {
                // Aquarium exam, don't set headers unless it starts in 5 minutes
                DateTime threshold = DateTime.now().plusMinutes(5);
                DateTime start = dateTimeHandler.normalize(
                    enrolment.getReservation().getStartAt(),
                    enrolment.getReservation()
                );
                if (start.isBefore(threshold)) {
                    headers.put(
                        "x-exam-upcoming-exam",
                        String.format("%s:::%d", getExamHash(enrolment), enrolment.getId())
                    );
                }
            } else {
                // SEB exam
                headers.put(
                    "x-exam-upcoming-exam",
                    String.format("%s:::%d", getExamHash(enrolment), enrolment.getId())
                );
            }
        }
    }

    private boolean isInsideBounds(ExamEnrolment ee, int minutesToFuture) {
        DateTime earliest = ee.getExaminationEventConfiguration() == null
            ? dateTimeHandler.adjustDST(new DateTime())
            : DateTime.now();
        DateTime latest = earliest.plusMinutes(minutesToFuture);
        Reservation reservation = ee.getReservation();
        ExaminationEvent event = ee.getExaminationEventConfiguration() != null
            ? ee.getExaminationEventConfiguration().getExaminationEvent()
            : null;
        int delay = ee.getDelay();
        return (
            (reservation != null &&
                reservation.getStartAt().plusSeconds(delay).isBefore(latest) &&
                reservation.getEndAt().isAfter(earliest)) ||
            (event != null &&
                event.getStart().plusSeconds(delay).isBefore(latest) &&
                event.getStart().plusMinutes(ee.getExam().getDuration()).isAfter(earliest))
        );
    }

    private DateTime getStartTime(ExamEnrolment enrolment) {
        return enrolment.getReservation() != null
            ? enrolment.getReservation().getStartAt().plusSeconds(enrolment.getDelay())
            : enrolment
                .getExaminationEventConfiguration()
                .getExaminationEvent()
                .getStart()
                .plusSeconds(enrolment.getDelay());
    }

    private Optional<ExamEnrolment> getNextEnrolment(Long userId, int minutesToFuture) {
        Set<ExamEnrolment> results = db
            .find(ExamEnrolment.class)
            .fetch("reservation")
            .fetch("reservation.machine")
            .fetch("reservation.machine.room")
            .fetch("examinationEventConfiguration")
            .fetch("examinationEventConfiguration.examinationEvent")
            .fetch("exam")
            .fetch("externalExam")
            .fetch("collaborativeExam")
            .where()
            .eq("user.id", userId)
            .disjunction()
            .eq("exam.state", Exam.State.PUBLISHED)
            .eq("exam.state", Exam.State.STUDENT_STARTED)
            .eq("exam.state", Exam.State.INITIALIZED)
            .and()
            .isNull("exam")
            .eq("collaborativeExam.state", Exam.State.PUBLISHED)
            .endAnd()
            .jsonEqualTo("externalExam.content", "state", Exam.State.PUBLISHED.toString())
            .jsonEqualTo("externalExam.content", "state", Exam.State.STUDENT_STARTED.toString())
            .endJunction()
            .or()
            .isNotNull("reservation.machine")
            .isNotNull("examinationEventConfiguration")
            .endOr()
            .findSet();
        // filter out enrolments that are over or not starting until tomorrow and pick the earliest (if any)
        return results
            .stream()
            .filter(ee -> isInsideBounds(ee, minutesToFuture))
            .min(Comparator.comparing(this::getStartTime));
    }
}
