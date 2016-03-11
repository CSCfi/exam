package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import com.avaje.ebean.Model;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.PathProperties;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import org.joda.time.DateTime;
import play.Logger;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;
import util.java.ValidationUtil;

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

    private List<Exam> getAllExams(Optional<String> filter) {
        ExpressionList<Exam> query = createPrototypeQuery();
        if (filter.isPresent()) {
            query = query.disjunction();
            query = applyUserFilter("examOwners", query, filter.get());
            String condition = String.format("%%%s%%", filter.get());
            query = query
                    .ilike("name", condition)
                    .ilike("course.code", condition)
                    .endJunction();
        }
        return query.findList();
    }

    private static ExpressionList<Exam> applyOptionalFilters(ExpressionList<Exam> query, Optional<List<Long>> courseIds,
                                                             Optional<List<Long>> sectionIds, Optional<List<Long>> tagIds) {
        if (courseIds.isPresent() && !courseIds.get().isEmpty()) {
            query = query.in("course.id", courseIds.get());
        }
        if (sectionIds.isPresent() && !sectionIds.get().isEmpty()) {
            query = query.in("examSections.id", sectionIds.get());
        }
        if (tagIds.isPresent() && !tagIds.get().isEmpty()) {
            query = query.in("examSections.sectionQuestions.question.parent.tags.id", tagIds.get());
        }
        return query;
    }

    private static List<Exam> getAllExams(Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds, Optional<List<Long>> tagIds) {
        ExpressionList<Exam> query = createPrototypeQuery().isNotNull("name");
        query = applyOptionalFilters(query, courseIds, sectionIds, tagIds);
        return query.findList();
    }

    private static List<Exam> getAllExamsOfTeacher(User user, Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds, Optional<List<Long>> tagIds) {
        ExpressionList<Exam> query = createPrototypeQuery()
                .eq("examOwners", user)
                .isNotNull("name");
        query = applyOptionalFilters(query, courseIds, sectionIds, tagIds);
        return query.orderBy("created").findList();
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
            exams = getAllExams(filter);
        } else {
            exams = getAllExamsOfTeacher(user);
        }
        return ok(exams);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listExams(Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds, Optional<List<Long>> tagIds) {
        User user = getLoggedUser();
        List<Exam> exams;
        if (user.hasRole("ADMIN", getSession())) {
            exams = getAllExams(courseIds, sectionIds, tagIds);
        } else {
            exams = getAllExamsOfTeacher(user, courseIds, sectionIds, tagIds);
        }
        return ok(exams);
    }

    private Set<Exam> filterByViewability(User user, Collection<Exam> src) {
        Set<Exam> dst = new LinkedHashSet<>();
        for (Exam e : src) {
            if (e.isOwnedBy(user)) {
                dst.add(e);
                continue;
            }
            for (Exam c : e.getChildren()) {
                boolean matchFound = false;
                for (ExamInspection ei : c.getExamInspections()) {
                    if (ei.getUser().equals(user)) {
                        dst.add(e);
                        matchFound = true;
                        break;
                    }
                }
                if (matchFound) {
                    break;
                }
            }
        }
        return dst;
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
                .eq("creator", user)
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
        return Exam.createQuery()
                .fetch("children.examEnrolments.user")
                .where()
                .idEq(id)
                .disjunction()
                .eq("state", Exam.State.DRAFT)
                .eq("state", Exam.State.SAVED)
                .eq("state", Exam.State.PUBLISHED)
                .endJunction()
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
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

        Exam exam = doGetExam(id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) ||
                getLoggedUser().hasRole("ADMIN", getSession())) {
            exam.getExamSections().stream().filter(ExamSection::getLotteryOn).forEach(ExamSection::shuffleQuestions);
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

    private Result updateStateAndValidate(Exam exam, JsonNode node) {
        Exam.State state = node.has("state") ? Exam.State.valueOf(node.get("state").asText()) : null;
        if (state != null) {
            if (exam.hasState(Exam.State.SAVED, Exam.State.DRAFT) && state == Exam.State.PUBLISHED) {
                // Exam is about to be published
                String str = ValidationUtil.validateExamForm(node);
                // invalid data
                if (str != null) {
                    return badRequest(str);
                }
                // no sections named
                if (exam.getExamSections().stream().anyMatch((section) -> section.getName() == null)) {
                    return badRequest("sitnet_exam_contains_unnamed_sections");
                }
                if (exam.getExamLanguages().isEmpty()) {
                    return badRequest("no exam languages specified");
                }
                if (exam.isPrivate()) {
                    // No participants added, this is not good.
                    if (exam.getExamEnrolments().isEmpty()) {
                        return badRequest("sitnet_no_participants");
                    }
                    notifyPartiesAboutPrivateExamPublication(exam);
                }
            }
            exam.setState(state);
        }
        return null;
    }

    private boolean isRestrictingValidityChange(Date newDate, Exam exam, boolean isStartDate) {
        Date oldDate = isStartDate ? exam.getExamActiveStartDate() : exam.getExamActiveEndDate();
        return isStartDate ? oldDate.before(newDate) : newDate.before(oldDate);
    }

    private Result updateTemporalFieldsAndValidate(Exam exam, JsonNode node, User user) {
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
                return forbidden("sitnet_error_future_reservations_exist");
            }
        }
        if (end != 0) {
            Date newEnd = new Date(end);
            if (isAdmin || !hasFutureReservations || !isRestrictingValidityChange(newEnd, exam, false)) {
                exam.setExamActiveEndDate(new Date(end));
            } else {
                return forbidden("sitnet_error_future_reservations_exist");
            }
        }
        if (newDuration != 0) {
            if (newDuration == exam.getDuration() || !hasFutureReservations || isAdmin) {
                exam.setDuration(newDuration);
            } else {
                return forbidden("sitnet_error_future_reservations_exist");
            }
        }
        return null;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id) {
        Exam exam = Exam.createQuery().where().idEq(id).findUnique();

        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || getLoggedUser().hasRole("ADMIN", getSession())) {
            JsonNode node = request().body().asJson();
            Result result = updateTemporalFieldsAndValidate(exam, node, user);
            if (result != null) {
                return result;
            }
            result = updateStateAndValidate(exam, node);
            if (result != null) {
                return result;
            }
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
        for (Map.Entry<Integer, GradeEvaluation> entry : gradeMap.entrySet()) {
            if (!handledEvaluations.contains(entry.getKey())) {
                entry.getValue().delete();
                config.getGradeEvaluations().remove(entry.getValue());
            }
        }
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

        exam.getSoftwareInfo().clear();
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result resetExamLanguages(Long eid) {
        Exam exam = Ebean.find(Exam.class, eid);

        exam.getExamLanguages().clear();
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamSoftwareInfo(Long eid) {
        List<String> softwareIds = parseArrayFieldFromBody("softwareIds");
        Exam exam = Ebean.find(Exam.class, eid);
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
        Language language = Ebean.find(Language.class, code);

        exam.getExamLanguages().add(language);
        exam.update();

        return ok(Json.toJson(exam));
    }

    private static Exam getPrototype(Long id) {

        return Ebean.find(Exam.class)
                .fetch("creator", "id")
                .fetch("examType", "id, type")
                .fetch("examSections", "id, name")
                .fetch("examSections.sectionQuestions", "sequenceNumber")
                .fetch("examSections.sectionQuestions.question", "id, type, question, instruction, maxScore, " +
                        "expectedWordCount, evaluationType, expanded")
                .fetch("examSections.sectionQuestions.question.parent", "id")
                .fetch("examSections.sectionQuestions.question.options", "id, option")
                .fetch("examSections.sectionQuestions.question.attachment", "fileName")
                .fetch("examLanguages", "code")
                .fetch("attachment", "fileName")
                .fetch("examOwners", "firstName, lastName")
                .fetch("examInspections.user", "firstName, lastName")
                .where()
                .idEq(id)
                .findUnique();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyExam(Long id) {
        User user = getLoggedUser();
        Exam prototype = getPrototype(id);
        if (prototype == null) {
            return notFound("sitnet_exam_not_found");
        }
        Exam copy = prototype.copy(user, false);
        copy.setName(String.format("**COPY**%s", copy.getName()));
        copy.setState(Exam.State.DRAFT);
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
    public Result createExamDraft(String executionType) {
        User user = getLoggedUser();
        Exam exam = new Exam();
        exam.setState(Exam.State.DRAFT);
        ExamExecutionType examExecutionType = Ebean.find(ExamExecutionType.class).where().eq("type", executionType).findUnique();
        if (examExecutionType == null) {
            return badRequest("Unsupported execution type");
        }
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
        User user = getLoggedUser();
        if (!isAllowedToUpdate(exam, user)) {
            return forbidden("sitnet_error_future_reservations_exist");
        }
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            Course course = Ebean.find(Course.class, cid);
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getEnrolmentsForUser(Long uid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name")
                .fetch("exam.course", "code")
                .fetch("reservation", "startAt")
                .fetch("reservation.machine", "name")
                .fetch("user", "id")
                .where()
                .eq("user.id", uid)
                .findList();
        return ok(enrolments);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getRoomInfoFromEnrollment(Long eid) {
        User user = getLoggedUser();
        ExpressionList<ExamEnrolment> query = Ebean.find(ExamEnrolment.class)
                .fetch("user", "id")
                .fetch("user.language")
                .fetch("reservation.machine.room", "roomInstruction, roomInstructionEN, roomInstructionSV")
                .where()
                .eq("exam.id", eid);
        if (user.hasRole("STUDENT", getSession())) {
            query = query.eq("user", user);
        }
        ExamEnrolment enrolment = query.findUnique();
        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getParticipationsForExam(Long eid) {

        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam", "id, name, state")
                .fetch("exam.course", "code")
                .fetch("exam.examOwners", "id, firstName, lastName")
                .fetch("user", "id")
                .where()
                .eq("exam.parent.id", eid)
                .disjunction()
                .eq("exam.state", Exam.State.ABORTED)
                .eq("exam.state", Exam.State.REVIEW)
                .eq("exam.state", Exam.State.REVIEW_STARTED)
                .eq("exam.state", Exam.State.GRADED)
                .eq("exam.state", Exam.State.GRADED_LOGGED)
                .endJunction()
                .findList();
        return ok(participations);
    }

    /**
     * returns exam owners. if exam is a child, return parent exam owners
     *
     * @param id parent exam id
     * @return list of users
     */
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamOwners(Long id) {
        Exam exam = Ebean.find(Exam.class).fetch("examOwners").where().idEq(id).findUnique();
        if (exam == null) {
            return notFound();
        }
        ArrayNode node = Json.newArray();
        exam.getExamOwners().stream().map(u -> {
            ObjectNode o = Json.newObject();
            o.put("firstName", u.getFirstName());
            o.put("id", u.getId());
            o.put("lastName", u.getLastName());
            return o;
        }).forEach(node::add);
        return ok(Json.toJson(node));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

        if (owner != null && exam != null) {
            exam.getExamOwners().add(owner);
            exam.update();
            return ok();
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

        if (owner != null && exam != null) {
            exam.getExamOwners().remove(owner);
            exam.update();
            return ok();
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertInspection(Long eid, Long uid) {
        ExamInspection inspection = bindForm(ExamInspection.class);
        User recipient = Ebean.find(User.class, uid);
        Exam exam = Ebean.find(Exam.class, eid);
        if (isInspectorOf(recipient, exam)) {
            return forbidden("already an inspector");
        }
        Comment comment = inspection.getComment();
        String msg = comment.getComment();
        // Exam name required before adding inspectors that are to receive an email notification
        // TODO: maybe the email should be sent at a different occasion?
        if ((exam.getName() == null || exam.getName().isEmpty()) && !msg.isEmpty()) {
            return badRequest("sitnet_exam_name_missing_or_too_short");
        }
        inspection.setExam(exam);
        inspection.setUser(recipient);
        inspection.setAssignedBy(getLoggedUser());
        if (!msg.isEmpty()) {
            AppUtil.setCreator(comment, getLoggedUser());
            inspection.setComment(comment);
            comment.save();
            actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
                emailComposer.composeExamReviewRequest(recipient, getLoggedUser(), exam, msg);
            }, actor.dispatcher());
        }
        inspection.save();
        // Add also as inspector to ongoing child exams if not already there.
        exam.getChildren().stream()
                .filter(c -> c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED) &&
                        !isInspectorOf(recipient, c))
                .forEach(c -> {
                    ExamInspection i = new ExamInspection();
                    i.setExam(c);
                    i.setUser(recipient);
                    i.setAssignedBy(getLoggedUser());
                    i.save();
                });

        return ok(Json.toJson(inspection));
    }

    private static boolean isInspectorOf(User user, Exam exam) {
        return exam.getExamInspections().stream()
                .anyMatch(ei -> ei.getUser().equals(user));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamInspections(Long id) {
        Set<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user", "id, email, firstName, lastName")
                .where()
                .eq("exam.id", id)
                .findSet();
        return ok(inspections);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteInspection(Long id) {
        ExamInspection inspection = Ebean.find(ExamInspection.class, id);
        User inspector = inspection.getUser();
        Exam exam = inspection.getExam();
        exam.getChildren()
                .stream()
                .filter(c -> c.hasState(Exam.State.REVIEW, Exam.State.STUDENT_STARTED, Exam.State.REVIEW_STARTED))
                .forEach(c -> c.getExamInspections()
                        .stream()
                        .filter(ei -> ei.getUser().equals(inspector))
                        .forEach(Model::delete));
        inspection.delete();
        return ok();
    }

}
