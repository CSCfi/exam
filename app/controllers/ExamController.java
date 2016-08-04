package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;

import javax.inject.Inject;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;


public class ExamController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

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
                "examOwners(id, firstName, lastName), executionType(type), " +
                "examInspections(id, user(id, firstName, lastName)), " +
                "examEnrolments(id, user(id), reservation(id, endAt)))");
        Query<Exam> query = Ebean.createQuery(Exam.class);
        props.apply(query);
        User user = getLoggedUser();
        List<Exam> exams = query
                .where()
                .eq("state", Exam.State.PUBLISHED)
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
            exam.getExamSections().stream().forEach(s -> s.setSectionQuestions(new TreeSet<>(s.getSectionQuestions())));
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
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", new FetchConfig().query())
                .fetch("examSections.sectionQuestions.question")
                .fetch("examSections.sectionQuestions.question.attachment")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option")
                .fetch("attachment")
                .fetch("creator")
                .fetch("examOwners")
                .where()
                .idEq(id)
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) ||
                getLoggedUser().hasRole("ADMIN", getSession())) {
            exam.getExamSections().stream().filter(ExamSection::getLotteryOn).forEach(ExamSection::shuffleQuestions);
            exam.setDerivedMaxScores();
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private void notifyPartiesAboutPrivateExamPublication(Exam exam) {
        User sender = getLoggedUser();
        // Include participants, inspectors and owners. Exclude the sender.
        Set<User> users = exam.getExamEnrolments().stream().map(ExamEnrolment::getUser).collect(Collectors.toSet());
        users.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        users.addAll(exam.getExamOwners());
        users.remove(sender);

        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User u : users) {
                emailComposer.composePrivateExamParticipantNotification(u, sender, exam);
                Logger.info("Exam participation notification email sent to {}", u.getEmail());
            }
        }, actor.dispatcher());
    }

    private Optional<Result> getFormValidationError(JsonNode node) {
        String examName = node.has("name") ? node.get("name").asText() : null;
        String reason = null;
        if (examName == null || examName.isEmpty()) {
            reason = "sitnet_error_exam_empty_name";
        }
        Long start = null, end = null;
        JsonNode startNode = node.get("examActiveStartDate");
        JsonNode endNode = node.get("examActiveEndDate");
        if (startNode != null && startNode.isLong()) {
            start = startNode.asLong();
        } else {
            reason = "sitnet_error_start_date";
        }
        if (endNode != null && endNode.isLong()) {
            end = endNode.asLong();
        } else {
            reason = "sitnet_error_end_date";
        }
        if (start != null && end != null) {
            if (start >= end) {
                reason = "sitnet_error_end_sooner_than_start";
            } else if (end <= DateTime.now().getMillis()) {
                reason = "sitnet_error_end_sooner_than_now";
            }
        }
        return reason == null ? Optional.empty() : Optional.of(badRequest(reason));
    }

    private Optional<Result> updateStateAndValidate(Exam exam, JsonNode node) {
        Exam.State state = node.has("state") ? Exam.State.valueOf(node.get("state").asText()) : null;
        if (state != null) {
            if (state == Exam.State.PUBLISHED) {
                // Exam is published or about to be published
                Optional<Result> err = getFormValidationError(node);
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
                if (exam.isPrivate() && exam.getState() != Exam.State.PUBLISHED) {
                    // No participants added, this is not good.
                    if (exam.getExamEnrolments().isEmpty()) {
                        return Optional.of(badRequest("sitnet_no_participants"));
                    }
                    notifyPartiesAboutPrivateExamPublication(exam);
                }
            }
            exam.setState(state);
        }
        return Optional.empty();
    }

    private boolean isRestrictingValidityChange(Date newDate, Exam exam, boolean isStartDate) {
        Date oldDate = isStartDate ? exam.getExamActiveStartDate() : exam.getExamActiveEndDate();
        return isStartDate ? oldDate.before(newDate) : newDate.before(oldDate);
    }

    private Optional<Result> updateTemporalFieldsAndValidate(Exam exam, JsonNode node, User user) {
        Long start = node.get("examActiveStartDate").asLong();
        Long end = node.get("examActiveEndDate").asLong();
        Integer newDuration = node.get("duration").asInt();
        boolean hasFutureReservations = hasFutureReservations(exam);
        boolean isAdmin = user.hasRole(Role.Name.ADMIN.toString(), getSession());
        if (start != 0) {
            Date newStart = new Date(start);
            if (isAdmin || !hasFutureReservations || !isRestrictingValidityChange(newStart, exam, true)) {
                exam.setExamActiveStartDate(new Date(start));
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        if (end != 0) {
            Date newEnd = new Date(end);
            if (isAdmin || !hasFutureReservations || !isRestrictingValidityChange(newEnd, exam, false)) {
                exam.setExamActiveEndDate(new Date(end));
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        if (newDuration != 0) {
            if (Objects.equals(newDuration, exam.getDuration()) || !hasFutureReservations || isAdmin) {
                exam.setDuration(newDuration);
            } else {
                return Optional.of(forbidden("sitnet_error_future_reservations_exist"));
            }
        }
        return Optional.empty();
    }

    private Result handleExamUpdate(Exam exam, JsonNode node) {
        String examName = node.get("name").asText();
        Boolean shared = node.has("shared") && node.get("shared").asBoolean(false);
        Integer grading = node.has("grading") ? node.get("grading").asInt() : null;
        String answerLanguage = node.has("answerLanguage") ? node.get("answerLanguage").asText() : null;
        String instruction = node.has("instruction") ? node.get("instruction").asText() : null;
        String enrollInstruction = node.has("enrollInstruction") ? node.get("enrollInstruction").asText() : null;
        Integer trialCount = node.has("trialCount") ? node.get("trialCount").asInt() : null;
        Boolean expanded = node.has("expanded") && node.get("expanded").asBoolean(false);
        if (examName != null) {
            exam.setName(examName);
        }
        exam.setShared(shared);

        // Scale and auto evaluation are intermingled, if scale changed then the auto evaluation needs be reset
        boolean gradeScaleChanged = false;
        if (grading != null) {
            gradeScaleChanged = updateGrading(exam, grading);
        }
        if (gradeScaleChanged) {
            if (exam.getAutoEvaluationConfig() != null) {
                exam.getAutoEvaluationConfig().delete();
                exam.setAutoEvaluationConfig(null);
            }
        } else {
            updateAutoEvaluationConfig(exam, node);
        }
        if (answerLanguage != null) {
            exam.setAnswerLanguage(answerLanguage);
        }
        if (instruction != null) {
            exam.setInstruction(instruction);
        }
        if (enrollInstruction != null) {
            exam.setEnrollInstruction(enrollInstruction);
        }
        if (node.has("examType")) {
            String examType = node.get("examType").get("type").asText();
            ExamType eType = Ebean.find(ExamType.class)
                    .where()
                    .eq("type", examType)
                    .findUnique();

            if (eType != null) {
                exam.setExamType(eType);
            }
        }

        exam.setTrialCount(trialCount);
        exam.generateHash();
        exam.setExpanded(expanded);
        exam.save();
        return ok(exam);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id) {
        Exam exam = prototypeQuery().where().idEq(id).findUnique();
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || getLoggedUser().hasRole("ADMIN", getSession())) {
            JsonNode node = request().body().asJson();
            return updateTemporalFieldsAndValidate(exam, node, user)
                    .orElseGet(() -> updateStateAndValidate(exam, node)
                            .orElseGet(() -> handleExamUpdate(exam, node)));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private static void updateGradeEvaluations(Exam exam, JsonNode node) {
        AutoEvaluationConfig config = exam.getAutoEvaluationConfig();

        Map<Integer, GradeEvaluation> gradeMap = config.asGradeMap();
        List<Integer> handledEvaluations = new ArrayList<>();
        // Handle proposed entries, persist new ones where necessary
        for (JsonNode evaluation : node.get("gradeEvaluations")) {
            Grade grade = Ebean.find(Grade.class, evaluation.get("grade").get("id").asInt());
            if (grade != null && exam.getGradeScale().getGrades().contains(grade)) {
                GradeEvaluation ge = gradeMap.get(grade.getId());
                if (ge == null) {
                    ge = new GradeEvaluation();
                    ge.setGrade(grade);
                    ge.setAutoEvaluationConfig(config);
                    config.getGradeEvaluations().add(ge);
                }
                ge.setPercentage(evaluation.get("percentage").asInt());
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

    private static void updateAutoEvaluationConfig(Exam exam, JsonNode node) {
        if (node.has("evaluationConfig")) {
            JsonNode jsonConfig = node.get("evaluationConfig");
            AutoEvaluationConfig config = exam.getAutoEvaluationConfig();
            if (jsonConfig.isNull()) {
                // User wishes to disable the config
                if (config != null) {
                    config.delete();
                    exam.setAutoEvaluationConfig(null);
                }
            } else {
                if (config == null) {
                    config = new AutoEvaluationConfig();
                    config.setGradeEvaluations(new HashSet<>());
                    config.setExam(exam);
                    exam.setAutoEvaluationConfig(config);
                }
                AutoEvaluationConfig.ReleaseType releaseType =
                        AutoEvaluationConfig.ReleaseType.valueOf(jsonConfig.get("releaseType").asText());
                config.setReleaseType(releaseType);
                switch (releaseType) {
                    case GIVEN_AMOUNT_DAYS:
                        config.setAmountDays(jsonConfig.get("amountDays").asInt());
                        config.setReleaseDate(null);
                        break;
                    case GIVEN_DATE:
                        Long releaseDateMs = jsonConfig.get("releaseDate").asLong();
                        config.setReleaseDate(new Date(releaseDateMs));
                        config.setAmountDays(null);
                        break;
                    default:
                        config.setReleaseDate(null);
                        config.setAmountDays(null);
                        break;
                }
                config.save();
                updateGradeEvaluations(exam, jsonConfig);
                exam.setAutoEvaluationConfig(config);
            }
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
    public Result resetExamSoftwareInfo(Long eid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }

        exam.getSoftwareInfo().clear();
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result resetExamLanguages(Long eid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        exam.getExamLanguages().clear();
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamSoftwareInfo(Long eid) {
        List<String> softwareIds = parseArrayFieldFromBody("softwareIds");
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        exam.getSoftwareInfo().clear();
        List<Software> software;
        if (!softwareIds.isEmpty()) {
            software = Ebean.find(Software.class).where().idIn(softwareIds).findList();
            exam.getSoftwareInfo().addAll(software);
            if (!softwareRequirementDoable(exam)) {
                return badRequest("sitnet_no_required_softwares");
            }
        }
        exam.update();
        return ok(Json.toJson(exam));
    }

    private static boolean softwareRequirementDoable(Exam exam) {
        List<ExamMachine> machines = Ebean.find(ExamMachine.class)
                .where()
                .eq("archived", false)
                .findList();

        return machines.stream().anyMatch((m) -> m.getSoftwareInfo().containsAll(exam.getSoftwareInfo()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addExamLanguage(Long eid, String code) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        Language language = Ebean.find(Language.class, code);
        exam.getExamLanguages().add(language);
        exam.update();

        return ok(Json.toJson(exam));
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
        copy.setExamActiveStartDate(now.toDate());
        copy.setExamActiveEndDate(now.plusDays(1).toDate());
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
        exam.setExamActiveStartDate(start.toDate());
        exam.setExamActiveEndDate(start.plusDays(1).toDate());
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
        Date now = new Date();
        return exam.getExamEnrolments().stream()
                .map(ExamEnrolment::getReservation)
                .anyMatch(r -> r != null && r.getEndAt().after(now));
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
            return ok(Json.toJson(exam));
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
            return ok(Json.toJson(exam));
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
                .fetch("examSections")
                .fetch("examSections.sectionQuestions", "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType")
                .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examSections.sectionQuestions.options")
                .fetch("examSections.sectionQuestions.options.option", "id, option, correctOption, defaultScore")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
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
