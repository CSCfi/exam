/*
 * Copyright (c) 2017 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
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

package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import impl.EmailComposer;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import models.*;
import models.questions.ClozeTestAnswer;
import models.questions.Question;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.With;
import sanitizers.Attrs;
import sanitizers.ExamUpdateSanitizer;
import scala.concurrent.duration.Duration;
import util.AppUtil;

import javax.inject.Inject;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.stream.Stream;


public class ExamController extends BaseController {

    protected final EmailComposer emailComposer;

    protected final ActorSystem actor;

    @Inject
    public ExamController(EmailComposer emailComposer, ActorSystem actor) {
        this.emailComposer = emailComposer;
        this.actor = actor;
    }

    private static ExpressionList<Exam> createPrototypeQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("creator")
                .fetch("examOwners")
                .fetch("examInspections.user")
                .fetch("examSections")
                .fetch("executionType")
                .fetch("parent")
                .where()
                .disjunction()
                .eq("state", Exam.State.PUBLISHED)
                .eq("state", Exam.State.SAVED)
                .eq("state", Exam.State.DRAFT)
                .endJunction();
    }

    private List<Exam> getAllExams(String filter) {
        ExpressionList<Exam> query = createPrototypeQuery();
        if (filter != null) {
            query = query.disjunction();
            query = applyUserFilter("examOwners", query, filter);
            String condition = String.format("%%%s%%", filter);
            query = query
                    .ilike("name", condition)
                    .ilike("course.code", condition)
                    .endJunction();
        }
        return query.findList();
    }

    private static List<Exam> getAllExamsOfTeacher(User user) {
        return createPrototypeQuery()
                .eq("examOwners", user)
                .orderBy("created").findList();
    }

    // HELPER METHODS END

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExams(Optional<String> filter) {
        User user = getLoggedUser();
        List<Exam> exams;
        if (user.hasRole("ADMIN", getSession())) {
            exams = getAllExams(filter.orElse(null));
        } else {
            exams = getAllExamsOfTeacher(user);
        }
        return ok(exams);
    }

    @Restrict({@Group("ADMIN")})
    public Result listPrintouts() {
        List<Exam> printouts = Ebean.find(Exam.class).where()
                .eq("executionType.type", ExamExecutionType.Type.PRINTOUT.toString())
                .eq("state", Exam.State.PUBLISHED)
                .ge("examinationDates.date", LocalDate.now())
                .findList();
        PathProperties pp = PathProperties.parse("(id, name, course(code), examinationDates(date), examOwners(firstName, lastName))");
        return ok(printouts, pp);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listExams(Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds, Optional<List<Long>> tagIds) {
        User user = getLoggedUser();
        List<Long> courses = courseIds.orElse(Collections.emptyList());
        List<Long> sections = sectionIds.orElse(Collections.emptyList());
        List<Long> tags = tagIds.orElse(Collections.emptyList());
        PathProperties pp = PathProperties.parse("(id, name, course(id, code), examSections(id, name))");
        Query<Exam> query = Ebean.find(Exam.class);
        pp.apply(query);
        ExpressionList<Exam> el = query.where().isNotNull("name").isNotNull("course");
        if (!user.hasRole("ADMIN", getSession())) {
            el = el.eq("examOwners", user);
        }
        if (!courses.isEmpty()) {
            el = el.in("course.id", courses);
        }
        if (!sections.isEmpty()) {
            el = el.in("examSections.id", sections);
        }
        if (!tags.isEmpty()) {
            el = el.in("examSections.sectionQuestions.question.parent.tags.id", tags);
        }
        return ok(el.findList(), pp);
    }

    @Restrict(@Group("TEACHER"))
    public Result getTeachersExams() {
        // Get list of exams that user is assigned to inspect or is creator of
        PathProperties props = PathProperties.parse("(*, course(id, code), " +
                "children(id, state, examInspections(user(id, firstName, lastName))), " +
                "examinationDates(*), " +
                "examOwners(id, firstName, lastName), executionType(type), " +
                "examInspections(id, user(id, firstName, lastName)), " +
                "examEnrolments(id, user(id), reservation(id, endAt)))");
        Query<Exam> query = Ebean.createQuery(Exam.class);
        props.apply(query);
        User user = getLoggedUser();
        List<Exam> exams = query
                .where()
                .in("state", Exam.State.PUBLISHED, Exam.State.SAVED, Exam.State.DRAFT)
                .disjunction()
                .eq("examInspections.user", user)
                .eq("examOwners", user)
                .endJunction()
                .isNull("parent")
                .orderBy("created").findList();
        return ok(exams, props);
    }

    private boolean isAllowedToRemove(Exam exam) {
        return !hasFutureReservations(exam) && exam.getChildren().isEmpty();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteExam(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (user.hasRole("ADMIN", getSession()) || exam.isOwnedOrCreatedBy(user)) {
            if (isAllowedToRemove(exam)) {
                AppUtil.setModifier(exam, user);
                exam.setState(Exam.State.DELETED);
                exam.update();
                return ok("Exam deleted");
            }
            return forbidden("sitnet_exam_removal_not_possible");
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    private static Exam doGetExam(Long id) {
        return prototypeQuery()
                .where()
                .idEq(id)
                .disjunction()
                .eq("state", Exam.State.DRAFT)
                .eq("state", Exam.State.SAVED)
                .eq("state", Exam.State.PUBLISHED)
                .endJunction()
                .findUnique();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExam(Long id) {
        Exam exam = doGetExam(id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole("ADMIN", getSession())) {
            exam.getExamSections().forEach(s -> s.setSectionQuestions(new TreeSet<>(s.getSectionQuestions())));
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getExamTypes() {
        List<ExamType> types = Ebean.find(ExamType.class).where().ne("deprecated", true).findList();
        return ok(types);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getExamGradeScales() {
        List<GradeScale> scales = Ebean.find(GradeScale.class).fetch("grades").findList();
        return ok(scales);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getExamExecutionTypes() {
        List<ExamExecutionType> types = Ebean.find(ExamExecutionType.class).findList();
        return ok(types);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamPreview(Long id) {
        User user = getLoggedUser();
        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("executionType")
                .fetch("examinationDates")
                .fetch("examLanguages")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", new FetchConfig().query())
                .fetch("examSections.sectionQuestions.question")
                .fetch("examSections.sectionQuestions.question.attachment")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option")
                .fetch("examSections.sectionQuestions.clozeTestAnswer")
                .fetch("attachment")
                .fetch("creator")
                .fetch("examOwners")
                .where()
                .idEq(id)
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
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

        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) ||
                getLoggedUser().hasRole("ADMIN", getSession())) {
            exam.getExamSections().stream().filter(ExamSection::getLotteryOn).forEach(ExamSection::shuffleQuestions);
            exam.setDerivedMaxScores();
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private void notifyParticipantsAboutPrivateExamPublication(Exam exam) {
        User sender = getLoggedUser();
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
        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User u : receivers) {
                emailComposer.composePrivateExamParticipantNotification(u, sender, exam);
                Logger.info("Exam participation notification email sent to {}", u.getEmail());
            }
        }, actor.dispatcher());
    }

    private Optional<Result> getFormValidationError(boolean checkPeriod) {
        String reason = null;
        if (checkPeriod) {
            Optional<DateTime> start = request().attrs().getOptional(Attrs.START_DATE);
            Optional<DateTime> end = request().attrs().getOptional(Attrs.END_DATE);
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

    private Optional<Result> updateStateAndValidate(Exam exam) {
        Optional<Exam.State> state = request().attrs().getOptional(Attrs.EXAM_STATE);
        if (state.isPresent()) {
            if (state.get() == Exam.State.PUBLISHED) {
                // Exam is published or about to be published
                Optional<Result> err = getFormValidationError(!exam.isPrintout());
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
                    if (!request().attrs().getOptional(Attrs.LANG_INSPECTION_REQUIRED).isPresent()) {
                        return Optional.of(badRequest("language inspection requirement not configured"));
                    }
                }
                if (exam.isPrivate() && exam.getState() != Exam.State.PUBLISHED) {
                    // No participants added, this is not good.
                    if (exam.getExamEnrolments().isEmpty()) {
                        return Optional.of(badRequest("sitnet_no_participants"));
                    }
                    notifyParticipantsAboutPrivateExamPublication(exam);
                }
                if (exam.isPrintout() && exam.getExaminationDates().isEmpty()) {
                    return Optional.of(badRequest("no examination dates specified"));
                }
            }
            exam.setState(state.get());
        }
        return Optional.empty();
    }

    private boolean isRestrictingValidityChange(DateTime newDate, Exam exam, boolean isStartDate) {
        DateTime oldDate = isStartDate ? exam.getExamActiveStartDate() : exam.getExamActiveEndDate();
        return isStartDate ? oldDate.isBefore(newDate) : newDate.isBefore(oldDate);
    }

    private Optional<Result> updateTemporalFieldsAndValidate(Exam exam, User user) {
        Optional<Integer> newDuration = request().attrs().getOptional(Attrs.DURATION);
        Optional<DateTime> newStart = request().attrs().getOptional(Attrs.START_DATE);
        Optional<DateTime> newEnd = request().attrs().getOptional(Attrs.END_DATE);

        // For printout exams everything is allowed
        if (exam.isPrintout()) {
            exam.setDuration(newDuration.orElse(null));
            return Optional.empty();
        }
        boolean hasFutureReservations = hasFutureReservations(exam);
        boolean isAdmin = user.hasRole(Role.Name.ADMIN.toString(), getSession());
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

    private Result handleExamUpdate(Exam exam) {
        Optional<String> examName = request().attrs().getOptional(Attrs.NAME);
        Boolean shared = request().attrs().getOptional(Attrs.SHARED).orElse(false);
        Optional<Integer> grading = request().attrs().getOptional(Attrs.GRADE_ID);
        Optional<String> answerLanguage = request().attrs().getOptional(Attrs.LANG);
        Optional<String> instruction = request().attrs().getOptional(Attrs.INSTRUCTION);
        Optional<String> enrollInstruction = request().attrs().getOptional(Attrs.ENROLMENT_INFORMATION);
        Optional<String> examType = request().attrs().getOptional(Attrs.TYPE);
        Integer trialCount = request().attrs().getOptional(Attrs.TRIAL_COUNT).orElse(null);
        Boolean expanded = request().attrs().getOptional(Attrs.EXPANDED).orElse(false);
        Boolean requiresLanguageInspection = request().attrs().getOptional(Attrs.LANG_INSPECTION_REQUIRED).orElse(null);
        String internalRef = request().attrs().getOptional(Attrs.REFERENCE).orElse(null);
        examName.ifPresent(exam::setName);
        exam.setShared(shared);

        // Scale and auto evaluation are intermingled, if scale changed then the auto evaluation needs be reset
        boolean gradeScaleChanged = false;
        if (grading.isPresent()) {
            gradeScaleChanged = updateGrading(exam, grading.get());
        }
        if (gradeScaleChanged) {
            if (exam.getAutoEvaluationConfig() != null) {
                exam.getAutoEvaluationConfig().delete();
                exam.setAutoEvaluationConfig(null);
            }
        } else {
            request().attrs().getOptional(Attrs.AUTO_EVALUATION_CONFIG)
                    .ifPresent(nc -> updateAutoEvaluationConfig(exam, nc));
        }
        answerLanguage.ifPresent(exam::setAnswerLanguage);
        instruction.ifPresent(exam::setInstruction);
        enrollInstruction.ifPresent(exam::setEnrollInstruction);
        examType.ifPresent(type -> {
            ExamType eType = Ebean.find(ExamType.class)
                    .where()
                    .eq("type", type)
                    .findUnique();

            if (eType != null) {
                exam.setExamType(eType);
            }
        });
        exam.setTrialCount(trialCount);
        exam.generateHash();
        exam.setExpanded(expanded);
        exam.setSubjectToLanguageInspection(requiresLanguageInspection);
        exam.setInternalRef(internalRef);
        exam.save();
        return ok(exam);
    }

    @With(ExamUpdateSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id) {
        Exam exam = prototypeQuery().where().idEq(id).findUnique();
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || getLoggedUser().hasRole("ADMIN", getSession())) {
            return updateTemporalFieldsAndValidate(exam, user)
                    .orElseGet(() -> updateStateAndValidate(exam)
                            .orElseGet(() -> handleExamUpdate(exam)));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private static void updateGradeEvaluations(Exam exam, AutoEvaluationConfig newConfig) {
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

    private static void updateAutoEvaluationConfig(Exam exam, AutoEvaluationConfig newConfig) {
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

    private static boolean updateGrading(Exam exam, int grading) {
        // Allow updating grading if allowed in settings or if course does not restrict the setting
        boolean canOverrideGrading = AppUtil.isCourseGradeScaleOverridable();
        boolean changed = false;
        if (canOverrideGrading || exam.getCourse().getGradeScale() == null) {
            GradeScale scale = Ebean.find(GradeScale.class).fetch("grades").where().idEq(grading).findUnique();
            if (scale != null) {
                changed = exam.getGradeScale() == null || !exam.getGradeScale().equals(scale);
                exam.setGradeScale(scale);
            } else {
                Logger.warn("Grade scale not found for ID {}. Not gonna update exam with it", grading);
            }
        }
        return changed;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamSoftware(Long eid, Long sid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!isPermittedToUpdate(exam, user)) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Software software = Ebean.find(Software.class, sid);
        if (exam.getSoftwareInfo().contains(software)) {
            exam.getSoftwareInfo().remove(software);
        } else {
            exam.getSoftwareInfo().add(software);
            if (!softwareRequirementDoable(exam)) {
                return badRequest("sitnet_no_required_softwares");
            }
        }
        exam.update();
        return ok();
    }

    private static boolean softwareRequirementDoable(Exam exam) {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return machines.stream().anyMatch((m) -> m.getSoftwareInfo().containsAll(exam.getSoftwareInfo()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamLanguage(Long eid, String code) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!isPermittedToUpdate(exam, user)) {
            return forbidden("sitnet_error_access_forbidden");
        }

        Language language = Ebean.find(Language.class, code);
        if (exam.getExamLanguages().contains(language)) {
            exam.getExamLanguages().remove(language);
        } else {
            exam.getExamLanguages().add(language);
        }
        exam.update();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyExam(Long id) {
        User user = getLoggedUser();
        Exam prototype = Ebean.find(Exam.class) // TODO: check if all this fetching is necessary
                .fetch("creator", "id")
                .fetch("examType", "id, type")
                .fetch("examSections", "id, name, sequenceNumber")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question", "id, type, question")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option", "id, option")
                .fetch("examLanguages", "code")
                .fetch("attachment", "fileName")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .where()
                .idEq(id)
                .findUnique();
        if (prototype == null) {
            return notFound("sitnet_exam_not_found");
        }
        String type = formFactory.form().bindFromRequest().get("type");
        ExamExecutionType executionType = Ebean.find(ExamExecutionType.class).where().eq("type", type).findUnique();
        if (type == null) {
            return notFound("sitnet_execution_type_not_found");
        }
        Exam copy = prototype.copy(user);
        copy.setName(String.format("**COPY**%s", copy.getName()));
        copy.setState(Exam.State.DRAFT);
        copy.setExecutionType(executionType);
        AppUtil.setCreator(copy, user);
        copy.setParent(null);
        copy.setCourse(null);
        DateTime now = DateTime.now().withTimeAtStartOfDay();
        copy.setExamActiveStartDate(now);
        copy.setExamActiveEndDate(now.plusDays(1));
        copy.save();
        return ok(copy);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createExamDraft() {
        String executionType = formFactory.form().bindFromRequest().get("executionType");
        ExamExecutionType examExecutionType = Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", executionType)
                .findUnique();
        if (examExecutionType == null) {
            return badRequest("Unsupported execution type");
        }
        User user = getLoggedUser();
        Exam exam = new Exam();
        exam.setState(Exam.State.DRAFT);
        exam.setExecutionType(examExecutionType);
        AppUtil.setCreator(exam, user);
        exam.save();

        ExamSection examSection = new ExamSection();
        AppUtil.setCreator(examSection, user);

        examSection.setExam(exam);
        examSection.setExpanded(true);
        examSection.setSequenceNumber(0);
        examSection.save();

        exam.getExamSections().add(examSection);
        exam.getExamLanguages().add(Ebean.find(Language.class, "fi")); // TODO: configurable?
        exam.setExamType(Ebean.find(ExamType.class, 2)); // Final

        DateTime start = DateTime.now().withTimeAtStartOfDay();
        if (!exam.isPrintout()) {
            exam.setExamActiveStartDate(start);
            exam.setExamActiveEndDate(start.plusDays(1));
        }
        exam.setDuration(AppUtil.getExamDurations().get(0));
        if (AppUtil.isCourseGradeScaleOverridable()) {
            exam.setGradeScale(Ebean.find(GradeScale.class).findList().get(0));
        }

        exam.save();

        exam.getExamOwners().add(getLoggedUser());
        exam.setTrialCount(1);

        exam.setExpanded(true);
        exam.save();

        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());

        ObjectNode typeNode = Json.newObject();
        typeNode.put("type", examExecutionType.getType());
        part.set("executionType", typeNode);
        return ok(Json.toJson(part));
    }

    private boolean hasFutureReservations(Exam exam) {
        DateTime now = DateTime.now();
        return exam.getExamEnrolments().stream()
                .map(ExamEnrolment::getReservation)
                .anyMatch(r -> r != null && r.getEndAt().isAfter(now));
    }

    private boolean isPermittedToUpdate(Exam exam, User user) {
        return user.hasRole(Role.Name.ADMIN.toString(), getSession()) || exam.isOwnedOrCreatedBy(user);
    }

    private boolean isAllowedToUpdate(Exam exam, User user) {
        return user.hasRole(Role.Name.ADMIN.toString(), getSession()) || !hasFutureReservations(exam);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateCourse(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!isAllowedToUpdate(exam, user)) {
            return forbidden("sitnet_error_future_reservations_exist");
        }
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            Course course = Ebean.find(Course.class, cid);
            if (course == null) {
                return notFound("sitnet_error_not_found");
            }
            Date now = new Date();
            if (course.getStartDate() != null && course.getStartDate().after(now)) {
                return forbidden("sitnet_error_course_not_active");
            }
            if (course.getEndDate() != null && course.getEndDate().before(now)) {
                return forbidden("sitnet_error_course_not_active");
            }
            exam.setCourse(course);
            exam.save();
            return ok(course);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeCourse(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!isAllowedToUpdate(exam, user)) {
            return forbidden("sitnet_error_future_reservations_exist");
        }
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            exam.setCourse(null);
            exam.save();
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private static Query<Exam> prototypeQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("course.organisation")
                .fetch("course.gradeScale")
                .fetch("course.gradeScale.grades", new FetchConfig().query())
                .fetch("examType")
                .fetch("autoEvaluationConfig")
                .fetch("autoEvaluationConfig.gradeEvaluations", new FetchConfig().query())
                .fetch("executionType")
                .fetch("examinationDates")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType")
                .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.options", new FetchConfig().query())
                .fetch("examSections.sectionQuestions.options.option", "id, option, correctOption, defaultScore")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("examEnrolments", "preEnrolledUserEmail")
                .fetch("examEnrolments.user")
                .fetch("examEnrolments.reservation", "endAt")
                .fetch("children", "id")
                .fetch("children.examEnrolments", "id")
                .fetch("children.examEnrolments.user", "firstName, lastName, userIdentifier")
                .fetch("creditType")
                .fetch("attachment")
                .fetch("softwares")
                .fetch("examLanguages")
                .fetch("examOwners");
    }

}
