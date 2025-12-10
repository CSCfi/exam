// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.exam;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ObjectNode;
import controllers.base.BaseController;
import controllers.exam.copy.ExamCopyContext;
import impl.ExamUpdater;
import io.ebean.DB;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import java.util.Collections;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import javax.inject.Inject;
import miscellaneous.config.ByodConfigHandler;
import miscellaneous.config.ConfigReader;
import miscellaneous.user.UserHandler;
import models.exam.Course;
import models.exam.Exam;
import models.exam.ExamExecutionType;
import models.exam.ExamType;
import models.exam.Grade;
import models.exam.GradeScale;
import models.facility.ExamMachine;
import models.facility.Software;
import models.sections.ExamSection;
import models.user.Language;
import models.user.Permission;
import models.user.Role;
import models.user.User;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;
import security.Authenticated;
import system.interceptors.Anonymous;
import validation.core.Attrs;
import validation.exam.ExamDraftValidator;
import validation.exam.ExamUpdateValidator;

public class ExamController extends BaseController {

    private final ExamUpdater examUpdater;
    private final ConfigReader configReader;
    private final ByodConfigHandler byodConfigHandler;
    private final UserHandler userHandler;

    @Inject
    public ExamController(
        ExamUpdater examUpdater,
        ConfigReader configReader,
        ByodConfigHandler byodConfigHandler,
        UserHandler userHandler
    ) {
        this.examUpdater = examUpdater;
        this.configReader = configReader;
        this.byodConfigHandler = byodConfigHandler;
        this.userHandler = userHandler;
    }

    private ExpressionList<Exam> createPrototypeQuery() {
        return DB.find(Exam.class)
            .fetch("course")
            .fetch("creator")
            .fetch("examOwners")
            .fetch("examInspections.user")
            .fetch("examSections")
            .fetch("executionType")
            .fetch("parent")
            .where()
            .or()
            .eq("state", Exam.State.PUBLISHED)
            .eq("state", Exam.State.SAVED)
            .eq("state", Exam.State.DRAFT)
            .endOr();
    }

    private List<Exam> getAllExams(String filter) {
        var query = createPrototypeQuery();
        if (filter != null) {
            query = query.or();
            query = userHandler.applyNameSearch("examOwners", query, filter);
            String condition = String.format("%%%s%%", filter);
            query = query.ilike("name", condition).ilike("course.code", condition).endOr();
        }
        return query.findList();
    }

    private List<Exam> getAllExamsOfTeacher(User user) {
        return createPrototypeQuery().eq("examOwners", user).orderBy("created").findList();
    }

    // HELPER METHODS END

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result searchExams(Optional<String> filter, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<Exam> exams;
        if (user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
            exams = getAllExams(filter.orElse(null));
        } else {
            exams = getAllExamsOfTeacher(user);
        }
        return ok(exams);
    }

    @Restrict({ @Group("ADMIN") })
    public Result listPrintouts() {
        List<Exam> printouts = DB.find(Exam.class)
            .where()
            .eq("executionType.type", ExamExecutionType.Type.PRINTOUT.toString())
            .eq("state", Exam.State.PUBLISHED)
            .ge("examinationDates.date", LocalDate.now())
            .findList();
        PathProperties pp = PathProperties.parse(
            "(id, name, course(code), examinationDates(date), examOwners(firstName, lastName))"
        );
        return ok(printouts, pp);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result listExams(
        Optional<List<Long>> courseIds,
        Optional<List<Long>> sectionIds,
        Optional<List<Long>> tagIds,
        Optional<List<Long>> ownerIds,
        Http.Request request
    ) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<Long> courses = courseIds.orElse(Collections.emptyList());
        List<Long> sections = sectionIds.orElse(Collections.emptyList());
        List<Long> tags = tagIds.orElse(Collections.emptyList());
        List<Long> owners = ownerIds.orElse(Collections.emptyList());
        PathProperties pp = PathProperties.parse(
            "(id, name, periodStart, periodEnd, course(id, code), examSections(id, name))"
        );
        var query = DB.find(Exam.class);
        pp.apply(query);
        var el = query.where().isNotNull("name").isNotNull("course").isNull("parent");
        if (!user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
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
        if (!owners.isEmpty()) {
            el = el.in("examOwners.id", owners);
        }
        return ok(el.findList(), pp);
    }

    @Authenticated
    @Restrict(@Group("TEACHER"))
    public Result getTeachersExams(Http.Request request) {
        // Get the list of exams that the user is assigned to inspect or is creator of
        PathProperties props = PathProperties.parse(
            "(*, course(id, code), " +
                "children(id, state, examInspections(user(id, firstName, lastName))), " +
                "examinationDates(*), " +
                "examOwners(id, firstName, lastName), executionType(type), " +
                "examInspections(id, user(id, firstName, lastName)), " +
                "examEnrolments(id, user(id), reservation(id, endAt), examinationEventConfiguration(examinationEvent(start))))"
        );
        var query = DB.createQuery(Exam.class);
        props.apply(query);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<Exam> exams = query
            .where()
            .in("state", Exam.State.PUBLISHED, Exam.State.SAVED, Exam.State.DRAFT)
            .disjunction()
            .eq("examInspections.user", user)
            .eq("examOwners", user)
            .endJunction()
            .isNull("parent")
            .orderBy("created")
            .findList();
        return ok(exams, props);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result deleteExam(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class, id);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT) || exam.isOwnedOrCreatedBy(user)) {
            if (examUpdater.isAllowedToRemove(exam)) {
                exam.setModifierWithDate(user);
                exam.setState(Exam.State.DELETED);
                exam.update();
                return ok();
            }
            return forbidden("i18n_exam_removal_not_possible");
        }
        return forbidden("i18n_error_access_forbidden");
    }

    private Exam getExam(Long id) {
        return prototypeQuery()
            .where()
            .idEq(id)
            .disjunction()
            .eq("state", Exam.State.DRAFT)
            .eq("state", Exam.State.SAVED)
            .eq("state", Exam.State.PUBLISHED)
            .endJunction()
            .findOne();
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    @Anonymous(filteredProperties = { "user" })
    public Result getExam(Long id, Http.Request request) {
        Exam exam = getExam(id);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        // decipher the passwords if any
        if (exam.getImplementation() == Exam.Implementation.CLIENT_AUTH) {
            exam
                .getExaminationEventConfigurations()
                .forEach(eec -> {
                    String plainTextSettingsPwd = byodConfigHandler.getPlaintextPassword(
                        eec.getEncryptedSettingsPassword(),
                        eec.getSettingsPasswordSalt()
                    );
                    eec.setSettingsPassword(plainTextSettingsPwd);
                    if (eec.getEncryptedQuitPassword() != null) {
                        String plainTextQuitPwd = byodConfigHandler.getPlaintextPassword(
                            eec.getEncryptedQuitPassword(),
                            eec.getQuitPasswordSalt()
                        );
                        eec.setQuitPassword(plainTextQuitPwd);
                    }
                });
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (
            exam.isShared() ||
            exam.isInspectedOrCreatedOrOwnedBy(user) ||
            user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        ) {
            exam.getExamSections().forEach(s -> s.setSectionQuestions(new TreeSet<>(s.getSectionQuestions())));
            return writeAnonymousResult(request, ok(exam), exam.isAnonymous());
        }
        return forbidden("i18n_error_access_forbidden");
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result getExamTypes() {
        List<ExamType> types = DB.find(ExamType.class).where().ne("deprecated", true).findList();
        return ok(types);
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result getExamGradeScales() {
        List<GradeScale> scales = DB.find(GradeScale.class).fetch("grades").findList();
        return ok(scales);
    }

    @Restrict({ @Group("ADMIN"), @Group("TEACHER"), @Group("SUPPORT") })
    public Result getExamExecutionTypes() {
        List<ExamExecutionType> types = DB.find(ExamExecutionType.class).where().ne("active", false).findList();
        return ok(types);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result getExamPreview(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam exam = DB.find(Exam.class)
            .fetch("course")
            .fetch("executionType")
            .fetch("examinationDates")
            .fetch("examLanguages")
            .fetch("examSections")
            .fetch("examSections.examMaterials")
            .fetch("examSections.sectionQuestions", FetchConfig.ofQuery())
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
            .findOne();
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        if (
            exam.isShared() ||
            exam.isInspectedOrCreatedOrOwnedBy(user) ||
            user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)
        ) {
            examUpdater.preparePreview(exam);
            return ok(exam);
        }
        return forbidden("i18n_error_access_forbidden");
    }

    private Result handleExamUpdate(Exam exam, User user, Exam payload) {
        Optional<Integer> grading = Optional.ofNullable(payload.getGrade()).map(Grade::getId);
        boolean gradeScaleChanged = false;
        if (grading.isPresent()) {
            gradeScaleChanged = didGradeChange(exam, grading.get());
        }
        final Role.Name loginRole = user.getLoginRole();
        examUpdater.update(exam, payload, loginRole);
        if (gradeScaleChanged) {
            if (exam.getAutoEvaluationConfig() != null) {
                exam.getAutoEvaluationConfig().delete();
                exam.setAutoEvaluationConfig(null);
            }
        } else if (Optional.ofNullable(payload.getAutoEvaluationConfig()).isPresent()) {
            examUpdater.updateAutoEvaluationConfig(exam, payload.getAutoEvaluationConfig());
        }
        if (Optional.ofNullable(payload.getExamFeedbackConfig()).isPresent()) {
            examUpdater.updateExamFeedbackConfig(exam, payload.getExamFeedbackConfig());
        }
        exam.save();
        return ok(exam);
    }

    @Authenticated
    @With(ExamUpdateValidator.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result updateExam(Long id, Http.Request request) {
        Exam exam = prototypeQuery().where().idEq(id).findOne();
        if (exam == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam payload = request.attrs().get(Attrs.EXAM);
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
            return examUpdater
                .updateTemporalFieldsAndValidate(exam, user, payload)
                .orElseGet(() ->
                    examUpdater
                        .updateStateAndValidate(exam, user, payload)
                        .orElseGet(() -> handleExamUpdate(exam, user, payload))
                );
        } else {
            return forbidden("i18n_error_access_forbidden");
        }
    }

    private boolean didGradeChange(Exam exam, int grading) {
        boolean canOverrideGrading = configReader.isCourseGradeScaleOverridable();
        boolean changed = false;
        if (canOverrideGrading || exam.getCourse().getGradeScale() == null) {
            GradeScale scale = DB.find(GradeScale.class).fetch("grades").where().idEq(grading).findOne();
            if (scale != null) {
                changed = exam.getGradeScale() == null || !exam.getGradeScale().equals(scale);
            }
        }
        return changed;
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result updateExamSoftware(Long eid, Long sid, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!examUpdater.isPermittedToUpdate(exam, user)) {
            return forbidden("i18n_error_access_forbidden");
        }
        Software software = DB.find(Software.class, sid);
        if (exam.getSoftwareInfo().contains(software)) {
            exam.getSoftwareInfo().remove(software);
        } else {
            exam.getSoftwareInfo().add(software);
            if (!softwareRequirementDoable(exam)) {
                return badRequest("i18n_no_required_softwares");
            }
        }
        exam.update();
        return ok();
    }

    private static boolean softwareRequirementDoable(Exam exam) {
        List<ExamMachine> machines = DB.find(ExamMachine.class).where().eq("archived", false).findList();

        return machines.stream().anyMatch(m -> new HashSet<>(m.getSoftwareInfo()).containsAll(exam.getSoftwareInfo()));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result updateExamLanguage(Long eid, String code, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return examUpdater
            .updateLanguage(exam, code, user)
            .orElseGet(() -> {
                exam.update();
                return ok();
            });
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result copyExam(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);

        String examinationType = formFactory.form().bindFromRequest(request).get("examinationType");
        if (
            Exam.Implementation.valueOf(examinationType) != Exam.Implementation.AQUARIUM &&
            !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
        ) {
            return forbidden("i18n_access_forbidden");
        }
        PathProperties pp = PathProperties.parse(
            "(" +
                "*, " +
                "examType(id, type), " +
                "examSections(id, name, sequenceNumber, " +
                "sectionQuestions(*, " +
                "question(id, type, question, attachment(fileName)), " +
                "options(*, option(id, option)))), " +
                "examLanguages(code), " +
                "attachment(fileName), " +
                "examOwners(firstName, lastName), " +
                "examInspections(*, user(firstName, lastName)), " +
                "softwares(*)" +
                ")"
        );
        var query = DB.find(Exam.class);
        pp.apply(query);
        Exam prototype = query.where().idEq(id).findOne();
        if (prototype == null) {
            return notFound("i18n_exam_not_found");
        }
        String type = formFactory.form().bindFromRequest(request).get("type");
        ExamExecutionType executionType = DB.find(ExamExecutionType.class).where().eq("type", type).findOne();
        if (executionType == null) {
            return notFound("i18n_execution_type_not_found");
        }
        // No sense in copying the AE config if grade scale is fixed to course (that will initially be NULL for a copy)
        if (prototype.getAutoEvaluationConfig() != null && !configReader.isCourseGradeScaleOverridable()) {
            prototype.setAutoEvaluationConfig(null);
        }
        ExamCopyContext context = ExamCopyContext.forTeacherCopy(user).build();
        Exam copy = prototype.createCopy(context);
        copy.setName(String.format("**COPY**%s", copy.getName()));
        copy.setState(Exam.State.DRAFT);
        copy.setExecutionType(executionType);
        copy.setImplementation(Exam.Implementation.valueOf(examinationType));
        copy.setCreatorWithDate(user);
        copy.setParent(null);
        copy.setCourse(null);
        copy.setExamFeedbackConfig(null);
        copy.setSubjectToLanguageInspection(null);
        DateTime now = DateTime.now().withTimeAtStartOfDay();
        copy.setPeriodStart(now);
        copy.setPeriodEnd(now.plusDays(1));
        // Force anonymous review if globally enabled for public examinations
        if (!copy.isPrivate()) {
            copy.setAnonymous(false);
        } else if (configReader.isAnonymousReviewEnabled()) {
            copy.setAnonymous(true);
        }
        copy.setGradingType(Grade.Type.GRADED);
        copy.save();
        return ok(copy);
    }

    @Authenticated
    @With(ExamDraftValidator.class)
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result createExamDraft(Http.Request request) {
        Exam payload = request.attrs().get(Attrs.EXAM);
        String executionType = payload.getExecutionType().getType();
        String implementation = payload.getImplementation().toString();
        ExamExecutionType examExecutionType = DB.find(ExamExecutionType.class)
            .where()
            .eq("type", executionType)
            .findOne();
        if (examExecutionType == null) {
            return badRequest("Unsupported execution type");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (
            Exam.Implementation.valueOf(implementation) != Exam.Implementation.AQUARIUM &&
            !user.hasPermission(Permission.Type.CAN_CREATE_BYOD_EXAM)
        ) {
            return forbidden("No permission to create home examinations");
        }
        Exam exam = new Exam();
        exam.generateHash();
        exam.setState(Exam.State.DRAFT);
        exam.setImplementation(Exam.Implementation.valueOf(implementation));
        exam.setExecutionType(examExecutionType);
        if (ExamExecutionType.Type.PUBLIC.toString().equals(examExecutionType.getType())) {
            exam.setAnonymous(configReader.isAnonymousReviewEnabled());
        }
        exam.setCreatorWithDate(user);
        exam.setGradingType(Grade.Type.GRADED);
        exam.save();

        ExamSection examSection = new ExamSection();
        examSection.setCreatorWithDate(user);

        examSection.setExam(exam);
        examSection.setExpanded(true);
        examSection.setSequenceNumber(0);
        examSection.save();

        exam.getExamSections().add(examSection);
        exam.getExamLanguages().add(DB.find(Language.class, "fi")); // TODO: configurable?
        exam.setExamType(DB.find(ExamType.class, 2)); // Final

        DateTime start = DateTime.now().withTimeAtStartOfDay();
        if (!exam.isPrintout()) {
            exam.setPeriodStart(start);
            exam.setPeriodEnd(start.plusDays(1));
        }
        exam.setDuration(configReader.getExamDurationsJava().getFirst());
        if (configReader.isCourseGradeScaleOverridable()) {
            exam.setGradeScale(DB.find(GradeScale.class).findList().getFirst());
        }

        exam.save();

        exam.getExamOwners().add(user);
        exam.setTrialCount(1);

        exam.save();

        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());
        return ok(Json.toJson(Json.newObject().put("id", exam.getId())));
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("SUPPORT") })
    public Result updateCourse(Long eid, Long cid, Http.Request request) {
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return notFound("i18n_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!examUpdater.isAllowedToUpdate(exam, user)) {
            return forbidden("i18n_error_future_reservations_exist");
        }
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN, Role.Name.SUPPORT)) {
            Course course = DB.find(Course.class, cid);
            if (course == null) {
                return notFound("i18n_error_not_found");
            }
            if (course.getStartDate() != null) {
                DateTime validity = configReader.getCourseValidityDate(new DateTime(course.getStartDate()));
                if (validity.isAfterNow()) {
                    return forbidden("i18n_error_course_not_active");
                }
            }
            if (course.getEndDate() != null && course.getEndDate().before(new Date())) {
                return forbidden("i18n_error_course_not_active");
            }
            exam.setCourse(course);
            exam.save();
            return ok();
        } else {
            return forbidden("i18n_error_access_forbidden");
        }
    }

    private Query<Exam> prototypeQuery() {
        return DB.find(Exam.class)
            .fetch("course")
            .fetch("course.organisation")
            .fetch("course.gradeScale")
            .fetch("course.gradeScale.grades", FetchConfig.ofQuery())
            .fetch("examType")
            .fetch("autoEvaluationConfig")
            .fetch("autoEvaluationConfig.gradeEvaluations", FetchConfig.ofQuery())
            .fetch("examFeedbackConfig")
            .fetch("executionType")
            .fetch("examinationDates")
            .fetch("examinationEventConfigurations")
            .fetch("examinationEventConfigurations.examEnrolments")
            .fetch("examinationEventConfigurations.examinationEvent")
            .fetch("examSections")
            .fetch(
                "examSections.sectionQuestions",
                "sequenceNumber, maxScore, answerInstructions, evaluationCriteria, expectedWordCount, evaluationType"
            )
            .fetch("examSections.sectionQuestions.question", "id, type, question, shared")
            .fetch("examSections.sectionQuestions.question.attachment", "fileName")
            .fetch("examSections.sectionQuestions.options", FetchConfig.ofQuery())
            .fetch(
                "examSections.sectionQuestions.options.option",
                "id, option, correctOption, defaultScore, claimChoiceType"
            )
            .fetch("examSections.examMaterials")
            .fetch("gradeScale")
            .fetch("gradeScale.grades")
            .fetch("grade")
            .fetch("examEnrolments", "preEnrolledUserEmail")
            .fetch("examEnrolments.user")
            .fetch("examEnrolments.reservation", "endAt")
            .fetch("children", "id")
            .fetch("children.examEnrolments", "id")
            .fetch("children.examEnrolments.user", "firstName, lastName, userIdentifier, email")
            .fetch("children.examParticipation", "id")
            .fetch("children.examParticipation.user", "firstName, lastName, userIdentifier, email")
            .fetch("creditType")
            .fetch("attachment")
            .fetch("softwares")
            .fetch("examLanguages")
            .fetch("examOwners");
    }
}
