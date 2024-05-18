// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository;

import controllers.iop.collaboration.api.CollaborativeExamLoader;
import io.ebean.DB;
import io.ebean.Database;
import io.ebean.ExpressionList;
import io.ebean.Query;
import io.ebean.Transaction;
import io.ebean.text.PathProperties;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import java.util.stream.Collectors;
import javax.inject.Inject;
import models.Exam;
import models.ExamEnrolment;
import models.ExamParticipation;
import models.ExamRoom;
import models.Reservation;
import models.User;
import models.json.CollaborativeExam;
import models.questions.ClozeTestAnswer;
import models.questions.Question;
import models.sections.ExamSection;
import org.joda.time.DateTime;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import util.datetime.DateTimeHandler;

public class ExaminationRepository {

    private final Database db;
    private final CollaborativeExamLoader cel;
    private final DatabaseExecutionContext ec;
    private final DateTimeHandler dateTimeHandler;

    private final Logger logger = LoggerFactory.getLogger(ExaminationRepository.class);

    @Inject
    public ExaminationRepository(
        CollaborativeExamLoader cel,
        DatabaseExecutionContext databaseExecutionContext,
        DateTimeHandler dateTimeHandler
    ) {
        this.db = DB.getDefault();
        this.cel = cel;
        this.ec = databaseExecutionContext;
        this.dateTimeHandler = dateTimeHandler;
    }

    private Optional<Exam> doCreateExam(Exam prototype, User user, ExamEnrolment enrolment) {
        Optional<Exam> result;
        try (Transaction tx = db.beginTransaction()) {
            boolean isCollaborative = enrolment.getCollaborativeExam() != null;
            Reservation reservation = enrolment.getReservation();
            // TODO: support for optional sections in BYOD exams
            Set<Long> ids = reservation == null
                ? Collections.emptySet()
                : enrolment.getOptionalSections().stream().map(ExamSection::getId).collect(Collectors.toSet());
            Exam studentExam = prototype.copyForStudent(user, isCollaborative, ids);
            studentExam.setState(Exam.State.INITIALIZED);
            studentExam.setCreator(user);
            if (!isCollaborative) {
                studentExam.setParent(prototype);
            }
            studentExam.generateHash();
            db.save(studentExam);
            enrolment.setExam(studentExam);
            db.save(enrolment);
            tx.commit();
            result = Optional.of(studentExam);
        }
        return result;
    }

    public void processClozeTestQuestions(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam
            .getExamSections()
            .stream()
            .flatMap(es -> es.getSectionQuestions().stream())
            .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
            .forEach(esq -> {
                ClozeTestAnswer answer = esq.getClozeTestAnswer();
                if (answer == null) {
                    answer = new ClozeTestAnswer();
                }
                answer.setQuestion(esq);
                esq.setClozeTestAnswer(answer);
                db.update(esq);
                questionsToHide.add(esq.getQuestion());
            });
        questionsToHide.forEach(q -> q.setQuestion(null));
    }

    public CompletionStage<Exam> createFinalExam(Exam clone, User user, ExamEnrolment enrolment) {
        return CompletableFuture.supplyAsync(
            () -> {
                clone.setState(Exam.State.STUDENT_STARTED);
                db.update(clone);
                clone.setCloned(false);
                clone.setDerivedMaxScores();
                processClozeTestQuestions(clone);
                if (clone.getExamParticipation() == null) {
                    Reservation reservation = enrolment.getReservation();
                    ExamParticipation examParticipation = new ExamParticipation();
                    examParticipation.setUser(user);
                    examParticipation.setExam(clone);
                    examParticipation.setCollaborativeExam(enrolment.getCollaborativeExam());
                    examParticipation.setReservation(reservation);
                    if (enrolment.getExaminationEventConfiguration() != null) {
                        examParticipation.setExaminationEvent(
                            enrolment.getExaminationEventConfiguration().getExaminationEvent()
                        );
                    }
                    DateTime now = DateTime.now();
                    if (enrolment.getExaminationEventConfiguration() == null) {
                        now =
                            reservation == null
                                ? dateTimeHandler.adjustDST(DateTime.now())
                                : dateTimeHandler.adjustDST(
                                    DateTime.now(),
                                    enrolment.getReservation().getMachine().getRoom()
                                );
                    }
                    examParticipation.setStarted(now);
                    db.save(examParticipation);
                }
                return clone;
            },
            ec
        );
    }

    public CompletionStage<Optional<CollaborativeExam>> getCollaborativeExam(String hash) {
        return CompletableFuture.supplyAsync(
            () -> {
                Optional<CollaborativeExam> ce = db
                    .find(CollaborativeExam.class)
                    .where()
                    .eq("hash", hash)
                    .findOneOrEmpty();
                if (ce.isPresent()) {
                    return ce;
                }
                Optional<Exam> exam = db.find(Exam.class).where().eq("hash", hash).findOneOrEmpty();
                if (exam.isPresent()) {
                    if (!exam.get().getExamEnrolments().isEmpty()) {
                        CollaborativeExam ce2 = exam.get().getExamEnrolments().getFirst().getCollaborativeExam();
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
            return cel.downloadExam(ce);
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
        DateTime now = ee.getExaminationEventConfiguration() == null
            ? dateTimeHandler.adjustDST(DateTime.now())
            : DateTime.now();
        if (ee.getReservation() != null) {
            return (ee.getReservation().getStartAt().isBefore(now) && ee.getReservation().getEndAt().isAfter(now));
        } else if (ee.getExaminationEventConfiguration() != null) {
            DateTime start = ee.getExaminationEventConfiguration().getExaminationEvent().getStart();
            DateTime end = start.plusMinutes(ee.getExam().getDuration());
            return start.isBefore(now) && end.isAfter(now);
        }
        return false;
    }

    public CompletionStage<Optional<ExamEnrolment>> findEnrolment(
        User user,
        Exam prototype,
        CollaborativeExam ce,
        boolean allowFuture
    ) {
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
                    .filter(e -> allowFuture || isInEffect(e))
                    .toList();

                if (enrolments.size() > 1) {
                    logger.error("multiple enrolments found during examination");
                }
                return enrolments.isEmpty() ? Optional.empty() : Optional.of(enrolments.getFirst());
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
