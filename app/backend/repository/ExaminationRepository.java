package backend.repository;

import backend.controllers.iop.collaboration.api.CollaborativeExamLoader;
import backend.models.Exam;
import backend.models.ExamEnrolment;
import backend.models.ExamParticipation;
import backend.models.ExamRoom;
import backend.models.Reservation;
import backend.models.User;
import backend.models.json.CollaborativeExam;
import backend.models.sections.ExamSection;
import backend.util.datetime.DateTimeUtils;
import io.ebean.Ebean;
import io.ebean.EbeanServer;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.Transaction;
import io.ebean.text.PathProperties;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import javax.inject.Inject;
import org.joda.time.DateTime;
import play.Logger;
import play.db.ebean.EbeanConfig;

public class ExaminationRepository {
  private final EbeanServer db;
  private final CollaborativeExamLoader cel;
  private final DatabaseExecutionContext ec;

  private static final Logger.ALogger logger = Logger.of(ExaminationRepository.class);

  @Inject
  public ExaminationRepository(
    EbeanConfig ebeanConfig,
    CollaborativeExamLoader cel,
    DatabaseExecutionContext databaseExecutionContext
  ) {
    this.db = Ebean.getServer(ebeanConfig.defaultServer());
    this.cel = cel;
    this.ec = databaseExecutionContext;
  }

  private Optional<Exam> doCreateExam(Exam prototype, User user, ExamEnrolment enrolment) {
    Transaction txn = db.beginTransaction();
    Optional<Exam> result;
    try {
      boolean isCollaborative = enrolment.getCollaborativeExam() != null;
      Reservation reservation = enrolment.getReservation();
      // TODO: support for optional sections in BYOD exams
      Set<Long> ids = reservation == null
        ? Collections.emptySet()
        : reservation.getOptionalSections().stream().map(ExamSection::getId).collect(Collectors.toSet());
      Exam studentExam = prototype.copyForStudent(user, isCollaborative, ids);
      studentExam.setState(Exam.State.STUDENT_STARTED);
      studentExam.setCreator(user);
      if (!isCollaborative) {
        studentExam.setParent(prototype);
      }
      studentExam.generateHash();
      studentExam.save();
      enrolment.setExam(studentExam);
      enrolment.save();

      ExamParticipation examParticipation = new ExamParticipation();
      examParticipation.setUser(user);
      examParticipation.setExam(studentExam);
      examParticipation.setCollaborativeExam(enrolment.getCollaborativeExam());
      examParticipation.setReservation(reservation);
      if (enrolment.getExaminationEventConfiguration() != null) {
        examParticipation.setExaminationEvent(enrolment.getExaminationEventConfiguration().getExaminationEvent());
      }
      DateTime now = reservation == null
        ? DateTimeUtils.adjustDST(DateTime.now())
        : DateTimeUtils.adjustDST(DateTime.now(), enrolment.getReservation().getMachine().getRoom());
      examParticipation.setStarted(now);
      examParticipation.save();
      txn.commit();
      result = Optional.of(studentExam);
    } finally {
      txn.end();
    }
    return result;
  }

  public CompletionStage<Optional<CollaborativeExam>> getCollaborativeExam(String hash) {
    return CompletableFuture.supplyAsync(
      () -> {
        Optional<CollaborativeExam> ce = db.find(CollaborativeExam.class).where().eq("hash", hash).findOneOrEmpty();
        if (ce.isPresent()) {
          return ce;
        }
        Optional<Exam> exam = db.find(Exam.class).where().eq("hash", hash).findOneOrEmpty();
        if (exam.isPresent()) {
          if (!exam.get().getExamEnrolments().isEmpty()) {
            CollaborativeExam ce2 = exam.get().getExamEnrolments().get(0).getCollaborativeExam();
            return ce2 == null ? Optional.empty() : Optional.of(ce2);
          }
        }
        return ce;
      },
      ec
    );
  }

  public CompletionStage<Optional<Exam>> getPossibleClone(
    String hash,
    User user,
    CollaborativeExam ce,
    PathProperties pp
  ) {
    return CompletableFuture.supplyAsync(
      () -> {
        ExpressionList<Exam> query = createQuery(pp).where().eq("hash", hash).eq("creator", user);
        if (ce == null) {
          query = query.isNotNull("parent");
        }
        return query.findOneOrEmpty();
      },
      ec
    );
  }

  public CompletionStage<Optional<Exam>> getPrototype(String hash, CollaborativeExam ce, PathProperties pp) {
    if (ce != null) {
      return cel.downloadExam(ce); // TODO: execution context for WS?
    }
    return CompletableFuture.supplyAsync(
      () -> {
        Exam exam = createQuery(pp).where().eq("hash", hash).isNull("parent").findOne();
        if (exam == null) {
          return Optional.empty();
        }
        return Optional.of(exam);
      },
      ec
    );
  }

  private Query<Exam> createQuery(PathProperties pp) {
    Query<Exam> query = db.find(Exam.class);
    pp.apply(query);
    return query;
  }

  private boolean isInEffect(ExamEnrolment ee) {
    DateTime now = DateTimeUtils.adjustDST(DateTime.now());
    if (ee.getReservation() != null) {
      return (ee.getReservation().getStartAt().isBefore(now) && ee.getReservation().getEndAt().isAfter(now));
    } else if (ee.getExaminationEventConfiguration() != null) {
      DateTime start = ee.getExaminationEventConfiguration().getExaminationEvent().getStart();
      DateTime end = start.plusMinutes(ee.getExam().getDuration());
      return start.isBefore(now) && end.isAfter(now);
    }
    return false;
  }

  public CompletionStage<Optional<ExamEnrolment>> findEnrolment(User user, Exam prototype, CollaborativeExam ce) {
    return CompletableFuture.supplyAsync(
      () -> {
        List<ExamEnrolment> enrolments = db
          .find(ExamEnrolment.class)
          .fetch("reservation")
          .fetch("reservation.machine")
          .fetch("reservation.machine.room")
          .fetch("examinationEventConfiguration")
          .fetch("examinationEventConfiguration.examinationEvent")
          .where()
          .eq("user.id", user.getId())
          .or()
          .eq("exam.id", prototype.getId())
          .and()
          .eq("collaborativeExam.id", ce != null ? ce.getId() : -1)
          .isNull("exam.id")
          .endAnd()
          .endOr()
          .findList()
          .stream()
          .filter(this::isInEffect)
          .collect(Collectors.toList());

        if (enrolments.size() > 1) {
          logger.error("multiple enrolments found during examination");
        }
        return enrolments.isEmpty() ? Optional.empty() : Optional.of(enrolments.get(0));
      },
      ec
    );
  }

  public CompletionStage<Optional<ExamRoom>> findRoom(ExamEnrolment enrolment) {
    return CompletableFuture.supplyAsync(
      () ->
        db
          .find(ExamRoom.class)
          .fetch("mailAddress")
          .where()
          .eq("id", enrolment.getReservation().getMachine().getRoom().getId())
          .findOneOrEmpty(),
      ec
    );
  }

  public CompletionStage<Optional<Exam>> createExam(Exam prototype, User user, ExamEnrolment enrolment) {
    return CompletableFuture.supplyAsync(() -> doCreateExam(prototype, user, enrolment), ec);
  }
}
