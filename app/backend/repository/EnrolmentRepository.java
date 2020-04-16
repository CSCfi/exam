package backend.repository;

import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamMachine;
import backend.models.ExamRoom;
import backend.models.ExaminationEvent;
import backend.models.ExaminationEventConfiguration;
import backend.models.Reservation;
import backend.models.Session;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.sections.ExamSection;
import backend.util.config.ByodConfigHandler;
import backend.util.datetime.DateTimeUtils;
import io.ebean.Ebean;
import io.ebean.EbeanServer;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import javax.inject.Inject;
import org.apache.commons.codec.binary.Base64;
import org.joda.time.DateTime;
import org.joda.time.Minutes;
import org.joda.time.format.ISODateTimeFormat;
import play.Environment;
import play.Logger;
import play.db.ebean.EbeanConfig;
import play.mvc.Http;
import play.mvc.Result;

public class EnrolmentRepository {
  private final Environment environment;
  private final EbeanServer db;
  private final DatabaseExecutionContext ec;
  private final ByodConfigHandler byodConfigHandler;

  private static final Logger.ALogger logger = Logger.of(ExaminationRepository.class);

  @Inject
  public EnrolmentRepository(
    Environment environment,
    EbeanConfig ebeanConfig,
    DatabaseExecutionContext databaseExecutionContext,
    ByodConfigHandler byodConfigHandler
  ) {
    this.environment = environment;
    this.db = Ebean.getServer(ebeanConfig.defaultServer());
    this.ec = databaseExecutionContext;
    this.byodConfigHandler = byodConfigHandler;
  }

  public CompletionStage<Map<String, String>> getReservationHeaders(Http.Request request, Session session) {
    return CompletableFuture.supplyAsync(() -> doGetReservationHeaders(request, session), ec);
  }

  public CompletionStage<List<ExamEnrolment>> getStudentEnrolments(User user) {
    return CompletableFuture.supplyAsync(() -> doGetStudentEnrolments(user), ec);
  }

  private List<ExamEnrolment> doGetStudentEnrolments(User user) {
    DateTime now = DateTimeUtils.adjustDST(new DateTime());
    List<ExamEnrolment> enrolments = Ebean
      .find(ExamEnrolment.class)
      .fetch("examinationEventConfiguration")
      .fetch("examinationEventConfiguration.examinationEvent")
      .fetch("collaborativeExam")
      .fetch("exam")
      .fetch("exam.examinationEventConfigurations.examinationEvent")
      .fetch("exam.executionType")
      .fetch("exam.examSections", "name, description")
      .fetch("exam.course", "name, code")
      .fetch("exam.examLanguages")
      .fetch("exam.examOwners", "firstName, lastName")
      .fetch("exam.examInspections.user", "firstName, lastName")
      .fetch("reservation", "startAt, endAt, externalRef")
      .fetch("reservation.externalReservation")
      .fetch("reservation.externalReservation.mailAddress")
      .fetch("reservation.optionalSections")
      .fetch("reservation.optionalSections.examMaterials")
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
      .filter(
        ee ->
          ee.getExaminationEventConfiguration() == null ||
          ee.getExaminationEventConfiguration().getExaminationEvent().getStart().isAfter((now))
      )
      .collect(Collectors.toList());
    enrolments.forEach(
      ee -> {
        Exam exam = ee.getExam();
        if (exam != null && exam.getExamSections().stream().noneMatch(ExamSection::isOptional)) {
          // Hide section info if no optional sections exist
          exam.getExamSections().clear();
        }
      }
    );
    return enrolments
      .stream()
      .filter(
        ee -> {
          Exam exam = ee.getExam();
          if (exam != null && exam.getExamActiveEndDate() != null) {
            return (
              exam.getExamActiveEndDate().isAfterNow() &&
              exam.hasState(Exam.State.PUBLISHED, Exam.State.STUDENT_STARTED)
            );
          }
          CollaborativeExam ce = ee.getCollaborativeExam();
          return ce != null && ce.getExamActiveEndDate().isAfterNow();
        }
      )
      .collect(Collectors.toList());
  }

  private Map<String, String> doGetReservationHeaders(Http.RequestHeader request, Session session) {
    User user = db.find(User.class, session.getUserId());
    if (user == null) return Collections.emptyMap();
    Map<String, String> headers = new HashMap<>();
    Optional<ExamEnrolment> ongoingEnrolment = getNextEnrolment(user.getId(), 0);
    if (ongoingEnrolment.isPresent()) {
      handleOngoingEnrolment(ongoingEnrolment.get(), request, headers);
    } else {
      DateTime now = new DateTime();
      int lookAheadMinutes = Minutes.minutesBetween(now, now.plusDays(1).withMillisOfDay(0)).getMinutes();
      Optional<ExamEnrolment> upcomingEnrolment = getNextEnrolment(user.getId(), lookAheadMinutes);
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
    boolean requiresUserAgentAuth = enrolment.getExam() != null && enrolment.getExam().getRequiresUserAgentAuth();
    // Loose the checks for dev usage to facilitate for easier testing
    if (environment.isDev() && !requiresUserAgentAuth) {
      return true;
    }

    if (requiresUserAgentAuth && enrolment.getExam() != null) {
      ExaminationEventConfiguration config = enrolment.getExaminationEventConfiguration();
      Optional<Result> error = byodConfigHandler.checkUserAgent(request, config.getConfigKey());
      if (error.isPresent()) {
        String msg = ISODateTimeFormat.dateTime().print(new DateTime(config.getExaminationEvent().getStart()));
        headers.put("x-exam-wrong-agent-config", msg);
        return false;
      }
    } else {
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
          message =
            room.getCampus() +
            ":::" +
            room.getBuildingName() +
            ":::" +
            room.getRoomCode() +
            ":::" +
            examMachine.getName() +
            ":::" +
            ISODateTimeFormat.dateTime().print(new DateTime(enrolment.getReservation().getStartAt()));
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
    logger.debug("room and machine ok");
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
    if (isMachineOk(enrolment, request, headers)) {
      String hash = getExamHash(enrolment);
      headers.put("x-exam-start-exam", hash);
      headers.put("x-exam-upcoming-exam", enrolment.getId().toString());
    }
  }

  private boolean isInsideBounds(ExamEnrolment ee, DateTime earliest, DateTime latest) {
    Reservation reservation = ee.getReservation();
    ExaminationEvent event = ee.getExaminationEventConfiguration() != null
      ? ee.getExaminationEventConfiguration().getExaminationEvent()
      : null;
    return (
      (reservation != null && reservation.getStartAt().isBefore(latest) && reservation.getEndAt().isAfter(earliest)) ||
      (
        event != null &&
        event.getStart().isBefore(latest) &&
        event.getStart().plusMinutes(ee.getExam().getDuration()).isAfter(earliest)
      )
    );
  }

  private DateTime getStartTime(ExamEnrolment enrolment) {
    return enrolment.getReservation() != null
      ? enrolment.getReservation().getStartAt()
      : enrolment.getExaminationEventConfiguration().getExaminationEvent().getStart();
  }

  private Optional<ExamEnrolment> getNextEnrolment(Long userId, int minutesToFuture) {
    DateTime now = DateTimeUtils.adjustDST(new DateTime());
    DateTime future = now.plusMinutes(minutesToFuture);
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
    return results.stream().filter(ee -> isInsideBounds(ee, now, future)).min(Comparator.comparing(this::getStartTime));
  }
}
