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

package backend.controllers;

import java.util.Collections;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import java.util.TreeSet;
import javax.inject.Inject;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.fasterxml.jackson.databind.node.ObjectNode;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import io.ebean.FetchConfig;
import io.ebean.Query;
import io.ebean.text.PathProperties;
import org.joda.time.DateTime;
import org.joda.time.LocalDate;
import play.libs.Json;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.With;

import backend.controllers.base.BaseController;
import backend.impl.EmailComposer;
import backend.impl.ExamUpdater;
import backend.models.Course;
import backend.models.Exam;
import backend.models.ExamExecutionType;
import backend.models.ExamMachine;
import backend.models.ExamType;
import backend.models.GradeScale;
import backend.models.Language;
import backend.models.Role;
import backend.models.Software;
import backend.models.User;
import backend.models.sections.ExamSection;
import backend.sanitizers.Attrs;
import backend.sanitizers.ExamUpdateSanitizer;
import backend.system.interceptors.Anonymous;
import backend.security.Authenticated;
import backend.util.AppUtil;
import backend.util.config.ConfigUtil;


public class ExamController extends BaseController {

    protected final EmailComposer emailComposer;

    protected final ActorSystem actor;

    private final ExamUpdater examUpdater;

    @Inject
    public ExamController(EmailComposer emailComposer, ActorSystem actor, ExamUpdater examUpdater) {
        this.emailComposer = emailComposer;
        this.actor = actor;
        this.examUpdater = examUpdater;
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

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExams(Optional<String> filter, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<Exam> exams;
        if (user.hasRole(Role.Name.ADMIN)) {
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

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listExams(Optional<List<Long>> courseIds, Optional<List<Long>> sectionIds,
                            Optional<List<Long>> tagIds, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        List<Long> courses = courseIds.orElse(Collections.emptyList());
        List<Long> sections = sectionIds.orElse(Collections.emptyList());
        List<Long> tags = tagIds.orElse(Collections.emptyList());
        PathProperties pp = PathProperties.parse("(id, name, course(id, code), examSections(id, name))");
        Query<Exam> query = Ebean.find(Exam.class);
        pp.apply(query);
        ExpressionList<Exam> el = query.where().isNotNull("name").isNotNull("course").isNull("parent");
        if (!user.hasRole(Role.Name.ADMIN)) {
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

    @Authenticated
    @Restrict(@Group("TEACHER"))
    public Result getTeachersExams(Http.Request request) {
        // Get list of exams that user is assigned to inspect or is creator of
        PathProperties props = PathProperties.parse("(*, course(id, code), " +
                "children(id, state, examInspections(user(id, firstName, lastName))), " +
                "examinationDates(*), " +
                "examOwners(id, firstName, lastName), executionType(type), " +
                "examInspections(id, user(id, firstName, lastName)), " +
                "examEnrolments(id, user(id), reservation(id, endAt)))");
        Query<Exam> query = Ebean.createQuery(Exam.class);
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
                .orderBy("created").findList();
        return ok(exams, props);
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteExam(Long id, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.ADMIN) || exam.isOwnedOrCreatedBy(user)) {
            if (examUpdater.isAllowedToRemove(exam)) {
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
                .findOne();
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    @Anonymous(filteredProperties = {"user"})
    public Result getExam(Long id, Http.Request request) {
        Exam exam = doGetExam(id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole(Role.Name.ADMIN)) {
            exam.getExamSections().forEach(s -> s.setSectionQuestions(new TreeSet<>(s.getSectionQuestions())));
            return writeAnonymousResult(request, ok(exam), exam.isAnonymous());
        }
        return forbidden("sitnet_error_access_forbidden");
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
        List<ExamExecutionType> types = Ebean.find(ExamExecutionType.class)
                .where()
                .ne("active", false)
                .findList();
        return ok(types);
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamPreview(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam exam = Ebean.find(Exam.class)
                .fetch("course")
                .fetch("executionType")
                .fetch("examinationDates")
                .fetch("examLanguages")
                .fetch("examSections")
                .fetch("examSections.examMaterials")
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
                .findOne();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) ||
                user.hasRole(Role.Name.ADMIN)) {
            examUpdater.preparePreview(exam);
            return ok(exam);
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    private Result handleExamUpdate(Exam exam, User user, Http.Request request) {
        Optional<Integer> grading = request.attrs().getOptional(Attrs.GRADE_ID);
        boolean gradeScaleChanged = false;
        if (grading.isPresent()) {
            gradeScaleChanged = didGradeChange(exam, grading.get());
        }
        final Role.Name loginRole = user.getLoginRole();
        examUpdater.update(exam, request, loginRole);
        if (gradeScaleChanged) {
            if (exam.getAutoEvaluationConfig() != null) {
                exam.getAutoEvaluationConfig().delete();
                exam.setAutoEvaluationConfig(null);
            }
        } else if (request.attrs().containsKey(Attrs.AUTO_EVALUATION_CONFIG)) {
            examUpdater.updateAutoEvaluationConfig(exam, request.attrs().get(Attrs.AUTO_EVALUATION_CONFIG));
        }
        exam.save();
        return ok(exam);
    }

    @Authenticated
    @With(ExamUpdateSanitizer.class)
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id, Http.Request request) {
        Exam exam = prototypeQuery().where().idEq(id).findOne();
        if (exam == null) {
            return notFound();
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN)) {
            return examUpdater.updateTemporalFieldsAndValidate(exam, user, request)
                    .orElseGet(() -> examUpdater.updateStateAndValidate(exam, user, request)
                            .orElseGet(() -> handleExamUpdate(exam, user, request)));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }


    private boolean didGradeChange(Exam exam, int grading) {
        boolean canOverrideGrading = ConfigUtil.isCourseGradeScaleOverridable();
        boolean changed = false;
        if (canOverrideGrading || exam.getCourse().getGradeScale() == null) {
            GradeScale scale = Ebean.find(GradeScale.class).fetch("grades").where().idEq(grading).findOne();
            if (scale != null) {
                changed = exam.getGradeScale() == null || !exam.getGradeScale().equals(scale);
            }
        }
        return changed;
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamSoftware(Long eid, Long sid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!examUpdater.isPermittedToUpdate(exam, user)) {
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

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExamLanguage(Long eid, String code, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        return examUpdater.updateLanguage(exam, code, user).orElseGet(() -> {
            exam.update();
            return ok();
        });
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result copyExam(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
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
                .findOne();
        if (prototype == null) {
            return notFound("sitnet_exam_not_found");
        }
        String type = formFactory.form().bindFromRequest(request).get("type");
        ExamExecutionType executionType = Ebean.find(ExamExecutionType.class).where().eq("type", type).findOne();
        if (type == null) {
            return notFound("sitnet_execution_type_not_found");
        }
        // No sense in copying the AE config if grade scale is fixed to course (that will initially be NULL for a copy)
        if (prototype.getAutoEvaluationConfig() != null && !ConfigUtil.isCourseGradeScaleOverridable()) {
            prototype.setAutoEvaluationConfig(null);
        }
        Exam copy = prototype.copy(user);
        copy.setName(String.format("**COPY**%s", copy.getName()));
        copy.setState(Exam.State.DRAFT);
        copy.setExecutionType(executionType);
        AppUtil.setCreator(copy, user);
        copy.setParent(null);
        copy.setCourse(null);
        copy.setSubjectToLanguageInspection(null);
        DateTime now = DateTime.now().withTimeAtStartOfDay();
        copy.setExamActiveStartDate(now);
        copy.setExamActiveEndDate(now.plusDays(1));
        copy.save();
        return ok(copy);
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createExamDraft(Http.Request request) {
        String executionType = formFactory.form().bindFromRequest(request).get("executionType");
        ExamExecutionType examExecutionType = Ebean.find(ExamExecutionType.class)
                .where()
                .eq("type", executionType)
                .findOne();
        if (examExecutionType == null) {
            return badRequest("Unsupported execution type");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam exam = new Exam();
        exam.generateHash();
        exam.setState(Exam.State.DRAFT);
        exam.setExecutionType(examExecutionType);
        if (ExamExecutionType.Type.PUBLIC.toString().equals(examExecutionType.getType())) {
            exam.setAnonymous(ConfigUtil.isAnonymousReviewEnabled());
        }
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
        exam.setDuration(ConfigUtil.getExamDurations().get(0));
        if (ConfigUtil.isCourseGradeScaleOverridable()) {
            exam.setGradeScale(Ebean.find(GradeScale.class).findList().get(0));
        }

        exam.save();

        exam.getExamOwners().add(user);
        exam.setTrialCount(1);

        exam.setExpanded(true);
        exam.save();

        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());
        return ok(Json.toJson(Json.newObject().put("id", exam.getId())));
    }

    @Authenticated
    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateCourse(Long eid, Long cid, Http.Request request) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!examUpdater.isAllowedToUpdate(exam, user)) {
            return forbidden("sitnet_error_future_reservations_exist");
        }
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole(Role.Name.ADMIN)) {
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
            return ok();
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
                .fetch("examSections.examMaterials")
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
