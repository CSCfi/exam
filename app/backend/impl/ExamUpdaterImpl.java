package backend.impl;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import io.ebean.Ebean;
import org.joda.time.DateTime;
import play.Logger;
import play.mvc.Http;
import play.mvc.Result;
import scala.concurrent.duration.Duration;

import backend.models.*;
import backend.models.questions.ClozeTestAnswer;
import backend.models.questions.Question;
import backend.sanitizers.Attrs;
import backend.util.ConfigUtil;

import static play.mvc.Results.badRequest;
import static play.mvc.Results.forbidden;

public class ExamUpdaterImpl implements ExamUpdater {

    @Inject
    private EmailComposer emailComposer;

    @Inject
    private ActorSystem actorSystem;

    @Override
    public Optional<Result> updateTemporalFieldsAndValidate(Exam exam, User user, Http.Request request, Session session) {
        Optional<Integer> newDuration = request.attrs().getOptional(Attrs.DURATION);
        Optional<DateTime> newStart = request.attrs().getOptional(Attrs.START_DATE);
        Optional<DateTime> newEnd = request.attrs().getOptional(Attrs.END_DATE);

        // For printout exams everything is allowed
        if (exam.isPrintout()) {
            exam.setDuration(newDuration.orElse(null));
            return Optional.empty();
        }
        boolean hasFutureReservations = hasFutureReservations(exam);
        boolean isAdmin = user.hasRole(Role.Name.ADMIN.toString(), session);
        if (newStart.isPresent()) {
            if (isAdmin || !hasFutureReservations || !isRestrictingValidityChange(newStart.get(), exam, true)) {
                exam.setExamActiveStartDate(newStart.get());
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        if (newEnd.isPresent()) {
            if (isAdmin || !hasFutureReservations || !isRestrictingValidityChange(newEnd.get(), exam, false)) {
                exam.setExamActiveEndDate(newEnd.get());
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        if (newDuration.isPresent()) {
            if (Objects.equals(newDuration.get(), exam.getDuration()) || !hasFutureReservations || isAdmin) {
                exam.setDuration(newDuration.get());
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        return Optional.empty();
    }

    @Override
    public Optional<Result> updateStateAndValidate(Exam exam, User user, Http.Request request) {
        Optional<Exam.State> state = request.attrs().getOptional(Attrs.EXAM_STATE);
        if (state.isPresent()) {
            if (state.get() == Exam.State.PRE_PUBLISHED) {
                // Exam is pre-published or about to be pre-published
                // Exam is published or about to be published
                Optional<Result> err = getFormValidationError(!exam.isPrintout(), request);
                // invalid data
                if (err.isPresent()) {
                    return err;
                }
                if (exam.getExamLanguages().isEmpty()) {
                    return Optional.of(badRequest("no exam languages specified"));
                }
            }
            if (state.get() == Exam.State.PUBLISHED) {
                // Exam is published or about to be published
                Optional<Result> err = getFormValidationError(!exam.isPrintout(), request);
                // invalid data
                if (err.isPresent()) {
                    return err;
                }
                // no sections named
                if (exam.getExamSections().stream().anyMatch((section) -> section.getName() == null)) {
                    return Optional.of(badRequest("sitnet_exam_contains_unnamed_sections"));
                }
                if (exam.getExamLanguages().isEmpty()) {
                    return Optional.of(badRequest("no exam languages specified"));
                }
                if (exam.getExecutionType().getType().equals(ExamExecutionType.Type.MATURITY.toString())) {
                    if (!request.attrs().getOptional(Attrs.LANG_INSPECTION_REQUIRED).isPresent()) {
                        return Optional.of(badRequest("language inspection requirement not configured"));
                    }
                }
                if (exam.isPrivate() && exam.getState() != Exam.State.PUBLISHED) {
                    // No participants added, this is not good.
                    if (exam.getExamEnrolments().isEmpty()) {
                        return Optional.of(badRequest("sitnet_no_participants"));
                    }
                    notifyParticipantsAboutPrivateExamPublication(exam, user);
                }
                if (exam.isPrintout() && exam.getExaminationDates().isEmpty()) {
                    return Optional.of(badRequest("no examination dates specified"));
                }
            }
            exam.setState(state.get());
        }
        return Optional.empty();
    }

    @Override
    public void update(Exam exam, Http.Request request, Role.Name loginRole) {
        Optional<String> examName = request.attrs().getOptional(Attrs.NAME);
        Boolean shared = request.attrs().getOptional(Attrs.SHARED).orElse(false);
        Optional<Integer> grading = request.attrs().getOptional(Attrs.GRADE_ID);
        Optional<String> answerLanguage = request.attrs().getOptional(Attrs.LANG);
        Optional<String> instruction = request.attrs().getOptional(Attrs.INSTRUCTION);
        Optional<String> enrollInstruction = request.attrs().getOptional(Attrs.ENROLMENT_INFORMATION);
        Optional<String> examType = request.attrs().getOptional(Attrs.TYPE);
        Integer trialCount = request.attrs().getOptional(Attrs.TRIAL_COUNT).orElse(null);
        Boolean expanded = request.attrs().getOptional(Attrs.EXPANDED).orElse(false);
        Boolean requiresLanguageInspection = request.attrs().getOptional(Attrs.LANG_INSPECTION_REQUIRED).orElse(null);
        String internalRef = request.attrs().getOptional(Attrs.REFERENCE).orElse(null);
        Boolean anonymous = request.attrs().getOptional(Attrs.ANONYMOUS).orElse(false);
        examName.ifPresent(exam::setName);
        exam.setShared(shared);

        grading.ifPresent(g -> updateGrading(exam, g));

        answerLanguage.ifPresent(exam::setAnswerLanguage);
        instruction.ifPresent(exam::setInstruction);
        enrollInstruction.ifPresent(exam::setEnrollInstruction);
        examType.ifPresent(type -> {
            ExamType eType = Ebean.find(ExamType.class)
                    .where()
                    .eq("type", type)
                    .findOne();

            if (eType != null) {
                exam.setExamType(eType);
            }
        });
        exam.setTrialCount(trialCount);
        // exam.generateHash();
        exam.setExpanded(expanded);
        exam.setSubjectToLanguageInspection(requiresLanguageInspection);
        exam.setInternalRef(internalRef);
        if (loginRole == Role.Name.ADMIN &&
                ExamExecutionType.Type.PUBLIC.toString().equals(exam.getExecutionType().getType()) &&
                !hasFutureReservations(exam)) {
            exam.setAnonymous(anonymous);
        }
    }

    @Override
    public boolean isPermittedToUpdate(Exam exam, User user, Session session) {
        return user.hasRole(Role.Name.ADMIN.toString(), session) || exam.isOwnedOrCreatedBy(user);
    }

    @Override
    public boolean isAllowedToUpdate(Exam exam, User user, Session session) {
        return user.hasRole(Role.Name.ADMIN.toString(), session) || !hasFutureReservations(exam);
    }

    @Override
    public boolean isAllowedToRemove(Exam exam) {
        return !hasFutureReservations(exam) && exam.getChildren().isEmpty();
    }

    @Override
    public void updateAutoEvaluationConfig(Exam exam, AutoEvaluationConfig newConfig) {
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
        if (newConfig == null) {
            // User wishes to disable the config
            if (config != null) {
                config.delete();
                exam.setAutoEvaluationConfig(null);
            }
        } else {
            if (exam.getExecutionType().getType().equals(ExamExecutionType.Type.MATURITY.toString())) {
                Logger.warn("Attempting to set auto evaluation config for maturity type. Refusing to do so");
                return;
            }
            if (config == null) {
                config = new AutoEvaluationConfig();
                config.setGradeEvaluations(new HashSet<>());
                config.setExam(exam);
                exam.setAutoEvaluationConfig(config);
            }
            config.setReleaseType(newConfig.getReleaseType());
            switch (config.getReleaseType()) {
                case GIVEN_AMOUNT_DAYS:
                    config.setAmountDays(newConfig.getAmountDays());
                    config.setReleaseDate(null);
                    break;
                case GIVEN_DATE:
                    config.setReleaseDate(newConfig.getReleaseDate());
                    config.setAmountDays(null);
                    break;
                default:
                    config.setReleaseDate(null);
                    config.setAmountDays(null);
                    break;
            }
            config.save();
            updateGradeEvaluations(exam, newConfig);
            exam.setAutoEvaluationConfig(config);
        }
    }

    @Override
    public Optional<Result> updateLanguage(Exam exam, String code, User user, Session session) {
        if (!isPermittedToUpdate(exam, user, session)) {
            return Optional.of(forbidden("sitnet_error_access_forbidden"));
        }
        Language language = Ebean.find(Language.class, code);
        if (exam.getExamLanguages().contains(language)) {
            exam.getExamLanguages().remove(language);
        } else {
            exam.getExamLanguages().add(language);
        }
        return Optional.empty();
    }

    @Override
    public void preparePreview(Exam exam) {
        Set<Question> questionsToHide = new HashSet<>();
        exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(esq -> esq.getQuestion().getType() == Question.Type.ClozeTestQuestion)
                .forEach(esq -> {
                    ClozeTestAnswer answer = new ClozeTestAnswer();
                    answer.setQuestion(esq);
                    esq.setClozeTestAnswer(answer);
                    questionsToHide.add(esq.getQuestion());
                });
        questionsToHide.forEach(q -> q.setQuestion(null));
        exam.getExamSections().stream().filter(ExamSection::getLotteryOn).forEach(ExamSection::shuffleQuestions);
        exam.setDerivedMaxScores();
    }


    private void updateGradeEvaluations(Exam exam, AutoEvaluationConfig newConfig) {
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();

        Map<Integer, GradeEvaluation> gradeMap = config.asGradeMap();
        List<Integer> handledEvaluations = new ArrayList<>();
        GradeScale gs = exam.getGradeScale() == null ? exam.getCourse().getGradeScale() : exam.getGradeScale();
        // Handle proposed entries, persist new ones where necessary
        for (GradeEvaluation src : newConfig.getGradeEvaluations()) {
            Grade grade = Ebean.find(Grade.class, src.getGrade().getId());
            if (grade != null && gs.getGrades().contains(grade)) {
                GradeEvaluation ge = gradeMap.get(grade.getId());
                if (ge == null) {
                    ge = new GradeEvaluation();
                    ge.setGrade(grade);
                    ge.setAutoEvaluationConfig(config);
                    config.getGradeEvaluations().add(ge);
                }
                ge.setPercentage(src.getPercentage());
                ge.save();
                handledEvaluations.add(grade.getId());
            } else {
                throw new IllegalArgumentException("unknown grade");
            }
        }
        // Remove obsolete entries
        gradeMap.entrySet().stream()
                .filter(entry -> !handledEvaluations.contains(entry.getKey()))
                .forEach(entry -> {
                    entry.getValue().delete();
                    config.getGradeEvaluations().remove(entry.getValue());
                });
    }


    private boolean hasFutureReservations(Exam exam) {
        DateTime now = DateTime.now();
        return exam.getExamEnrolments().stream()
                .map(ExamEnrolment::getReservation)
                .anyMatch(r -> r != null && r.getEndAt().isAfter(now));
    }

    private Optional<Result> getFormValidationError(boolean checkPeriod, Http.Request request) {
        String reason = null;
        if (checkPeriod) {
            Optional<DateTime> start = request.attrs().getOptional(Attrs.START_DATE);
            Optional<DateTime> end = request.attrs().getOptional(Attrs.END_DATE);
            if (!start.isPresent()) {
                reason = "sitnet_error_start_date";
            }
            else if (!end.isPresent()) {
                reason = "sitnet_error_end_date";
            }
            else if (start.get().isAfter(end.get())) {
                reason = "sitnet_error_end_sooner_than_start";
            } else if (end.get().isBeforeNow()) {
                reason = "sitnet_error_end_sooner_than_now";
            }
        }
        return reason == null ? Optional.empty() : Optional.of(badRequest(reason));
    }

    private boolean isRestrictingValidityChange(DateTime newDate, Exam exam, boolean isStartDate) {
        DateTime oldDate = isStartDate ? exam.getExamActiveStartDate() : exam.getExamActiveEndDate();
        return isStartDate ? oldDate.isBefore(newDate) : newDate.isBefore(oldDate);
    }

    private void updateGrading(Exam exam, int grading) {
        // Allow updating grading if allowed in settings or if course does not restrict the setting
        boolean canOverrideGrading = ConfigUtil.isCourseGradeScaleOverridable();
        if (canOverrideGrading || exam.getCourse().getGradeScale() == null) {
            GradeScale scale = Ebean.find(GradeScale.class).fetch("grades").where().idEq(grading).findOne();
            if (scale != null) {
                exam.setGradeScale(scale);
            } else {
                Logger.warn("Grade scale not found for ID {}. Not gonna update exam with it", grading);
            }
        }
    }

    private void notifyParticipantsAboutPrivateExamPublication(Exam exam, User sender) {
        Set<User> enrolments = exam.getExamEnrolments().stream()
                .map(ExamEnrolment::getUser)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        Set<User> preEnrolments = exam.getExamEnrolments().stream()
                .map(ExamEnrolment::getPreEnrolledUserEmail)
                .filter(Objects::nonNull)
                .map(email -> {
                    User user = new User();
                    user.setEmail(email);
                    return user;
                }).collect(Collectors.toSet());
        Set<User> receivers = Stream.concat(enrolments.stream(), preEnrolments.stream()).collect(Collectors.toSet());
        actorSystem.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User u : receivers) {
                emailComposer.composePrivateExamParticipantNotification(u, sender, exam);
                Logger.info("Exam participation notification email sent to {}", u.getEmail());
            }
        }, actorSystem.dispatcher());
    }


}
