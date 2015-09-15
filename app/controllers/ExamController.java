package controllers;

import akka.actor.ActorSystem;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import models.questions.Answer;
import models.questions.MultipleChoiceOption;
import models.questions.Question;
import org.apache.commons.compress.archivers.ArchiveOutputStream;
import org.apache.commons.compress.archivers.tar.TarArchiveEntry;
import org.apache.commons.compress.archivers.tar.TarArchiveOutputStream;
import org.apache.commons.compress.utils.IOUtils;
import org.joda.time.DateTime;
import org.jsoup.Jsoup;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import scala.concurrent.duration.Duration;
import util.AppUtil;
import util.java.EmailComposer;
import util.java.ValidationUtil;

import javax.inject.Inject;
import java.io.*;
import java.text.DateFormat;
import java.text.ParseException;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.concurrent.TimeUnit;
import java.util.stream.Collectors;
import java.util.zip.GZIPOutputStream;

import static util.java.AttachmentUtils.setData;


public class ExamController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;

    @Inject
    protected ActorSystem actor;

    private static ExpressionList<Exam> createPrototypeQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("creator")
                .fetch("examSections")
                .fetch("parent").where()
                .disjunction()
                .eq("state", Exam.State.PUBLISHED)
                .eq("state", Exam.State.SAVED)
                .eq("state", Exam.State.DRAFT)
                .endJunction();
    }

    private static List<Exam> getAllExams() {
        return createPrototypeQuery().findList();
    }

    private static ExpressionList<Exam> applyOptionalFilters(ExpressionList<Exam> query, F.Option<List<Long>> courseIds,
                                                             F.Option<List<Long>> sectionIds, F.Option<List<Long>> tagIds) {
        if (courseIds.isDefined() && !courseIds.get().isEmpty()) {
            query = query.in("course.id", courseIds.get());
        }
        if (sectionIds.isDefined() && !sectionIds.get().isEmpty()) {
            query = query.in("examSections.id", sectionIds.get());
        }
        if (tagIds.isDefined() && !tagIds.get().isEmpty()) {
            query = query.in("examSections.sectionQuestions.question.parent.tags.id", tagIds.get());
        }
        return query;
    }

    private static List<Exam> getAllExams(F.Option<List<Long>> courseIds, F.Option<List<Long>> sectionIds, F.Option<List<Long>> tagIds) {
        ExpressionList<Exam> query = createPrototypeQuery();
        query = applyOptionalFilters(query, courseIds, sectionIds, tagIds);
        return query.findList();
    }

    private static List<Exam> getAllExamsOfTeacher(User user, F.Option<List<Long>> courseIds, F.Option<List<Long>> sectionIds, F.Option<List<Long>> tagIds) {
        ExpressionList<Exam> query = createPrototypeQuery()
                .disjunction()
                .eq("shared", true)
                .eq("creator", user)
                .eq("examOwners", user)
                .endJunction();
        query = applyOptionalFilters(query, courseIds, sectionIds, tagIds);
        return query.orderBy("created").findList();
    }

    private static List<Exam> getAllExamsOfTeacher(User user) {
        return createPrototypeQuery()
                .disjunction()
                .eq("shared", true)
                .eq("creator", user)
                .eq("examOwners", user)
                .endJunction().orderBy("created").findList();
    }

    // HELPER METHODS END

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExams() {
        User user = getLoggedUser();
        List<Exam> exams;
        if (user.hasRole("ADMIN")) {
            exams = getAllExams();
        } else {
            exams = getAllExamsOfTeacher(user);
        }
        return ok(exams);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listExams(F.Option<List<Long>> courseIds, F.Option<List<Long>> sectionIds, F.Option<List<Long>> tagIds) {
        User user = getLoggedUser();
        List<Exam> exams;
        if (user.hasRole("ADMIN")) {
            exams = getAllExams(courseIds, sectionIds, tagIds);
        } else {
            exams = getAllExamsOfTeacher(user, courseIds, sectionIds, tagIds);
        }
        return ok(exams);
    }

    @Restrict(@Group("TEACHER"))
    public Result getTeachersExams() {

        User user = getLoggedUser();

        // Get list of exams that user is assigned to inspect or is creator of
        List<Exam> exams = Ebean.find(Exam.class)
                .fetch("children", "id, state")
                .fetch("examOwners")
                .fetch("examInspections.user", "id, firstName, lastName")
                .fetch("examEnrolments.user", "id")
                .fetch("examEnrolments.reservation", "id")
                .fetch("course")
                .where()
                .eq("state", Exam.State.PUBLISHED)
                .disjunction()
                .eq("examInspections.user", user)
                .eq("creator", user)
                .eq("examOwners", user)
                .endJunction()
                .isNull("parent")
                .orderBy("created").findList();

        return ok(exams);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getFinishedExams() {
        List<Exam> finishedExams = Ebean.find(Exam.class)
                .where()
                .lt("examActiveEndDate", new Date())
                .findList();

        return ok(Json.toJson(finishedExams));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteExam(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        User user = getLoggedUser();
        if (user.hasRole("ADMIN") || exam.isOwnedOrCreatedBy(user)) {
            if (!exam.getChildren().isEmpty()) {
                // Can't delete because of child references
                exam.setState(Exam.State.ARCHIVED);
                AppUtil.setModifier(exam, user);
                exam.update();
                return ok("Exam archived");
            } else {
                // If we're here it means, this exam does not have any children.
                // e.g. this exam has never been cloned
                // we can safely delete it completely from DB

                // 1. remove enrolments. Though there shouldn't be any
                List<ExamEnrolment> examEnrolments = Ebean.find(ExamEnrolment.class)
                        .where()
                        .eq("exam.id", id)
                        .findList();
                examEnrolments.forEach(Model::delete);

                List<ExamInspection> examInspections = Ebean.find(ExamInspection.class)
                        .where()
                        .eq("exam.id", id)
                        .findList();

                // 2. remove inspections
                for (ExamInspection e : examInspections) {
                    e.getUser().getInspections().remove(e);
                    e.delete();
                }

                for (ExamSection es : exam.getExamSections()) {
                    es.getSectionQuestions().forEach(models.ExamSectionQuestion::delete);
                    es.getSectionQuestions().clear();
                    es.save();
                }

                exam.getExamSections().clear();

                // yes yes, its weird, but Ebean won't delete relations with ManyToMany on enchaced classes
                // so we just tell everyone its "deleted"
                exam.setState(Exam.State.DELETED);
                exam.save();

//                exam.delete();
            }


            return ok("Exam deleted");
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }

    }

    static Query<Exam> createQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("course.organisation")
                .fetch("course.gradeScale")
                .fetch("course.gradeScale.grades", new FetchConfig().query())
                .fetch("parent")
                .fetch("parent.creator")
                .fetch("parent.gradeScale")
                .fetch("parent.gradeScale.grades", new FetchConfig().query())
                .fetch("parent.examOwners", new FetchConfig().query())
                .fetch("examType")
                .fetch("executionType")
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .fetch("examSections.sectionQuestions.question.attachment")
                .fetch("examSections.sectionQuestions.question.options")
                .fetch("examSections.sectionQuestions.question.answer")
                .fetch("examSections.sectionQuestions.question.answer.attachment")
                .fetch("examSections.sectionQuestions.question.answer.options")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("examEnrolments.user")
                .fetch("examFeedback")
                .fetch("examFeedback.attachment")
                .fetch("creditType")
                .fetch("attachment")
                .fetch("creator")
                .fetch("softwares")
                .fetch("examLanguages")
                .fetch("examOwners");
    }

    private static Exam doGetExam(Long id) {
        return createQuery()
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
    public Result getExamReview(Long eid) {
        Exam exam = createQuery()
                .where()
                .eq("id", eid)
                .disjunction()
                .eq("state", Exam.State.ABORTED)
                .eq("state", Exam.State.REVIEW)
                .eq("state", Exam.State.REVIEW_STARTED)
                .eq("state", Exam.State.GRADED)
                .eq("state", Exam.State.GRADED_LOGGED)
                .eq("state", Exam.State.ARCHIVED)
                .endJunction()
                .orderBy("examSections.id, examSections.sectionQuestions.sequenceNumber")
                .findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (!exam.isInspectedOrCreatedOrOwnedBy(user, true) && !user.hasRole("ADMIN")) {
            return forbidden("sitnet_error_access_forbidden");
        }
        return ok(exam);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExam(Long id) {
        Exam exam = doGetExam(id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) || user.hasRole("ADMIN")) {
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
        List<GradeScale> scales = Ebean.find(GradeScale.class).findList();
        return ok(scales);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamPreview(Long id) {

        Exam exam = doGetExam(id);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isShared() || exam.isInspectedOrCreatedOrOwnedBy(user) || getLoggedUser().hasRole("ADMIN")) {
            exam.getExamSections().stream().filter(ExamSection::getLotteryOn).forEach(ExamSection::shuffleQuestions);
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reviewExam(Long id) {
        DynamicForm df = Form.form().bindFromRequest();
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("sitnet_exam_not_found");
        }
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden("Not allowed to update grading of this exam");
        }

        Integer grade = df.get("grade") == null || df.get("grade").equals("") ? null : Integer.parseInt(df.get("grade"));
        String additionalInfo = df.get("additionalInfo") == null ? null : df.get("additionalInfo");
        if (grade != null) {
            Grade examGrade = Ebean.find(Grade.class, grade);
            GradeScale scale = exam.getGradeScale() == null ? exam.getCourse().getGradeScale() : exam.getGradeScale();
            if (scale.getGrades().contains(examGrade)) {
                exam.setGrade(examGrade);
            } else {
                return badRequest("Invalid grade for this grade scale");
            }
        }
        String creditType = df.get("creditType");
        if (creditType != null) {
            ExamType eType = Ebean.find(ExamType.class)
                    .where()
                    .eq("type", creditType)
                    .findUnique();
            if (eType != null) {
                exam.setCreditType(eType);
            }
        }
        exam.setAdditionalInfo(additionalInfo);
        exam.setAnswerLanguage(df.get("answerLanguage"));
        exam.setState(Exam.State.valueOf(df.get("state")));

        if (df.get("customCredit") != null) {
            exam.setCustomCredit(Double.parseDouble(df.get("customCredit")));
        } else {
            exam.setCustomCredit(null);
        }
        // set user only if exam is really graded, not just modified
        if (exam.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED)) {
            exam.setGradedTime(new Date());
            exam.setGradedByUser(getLoggedUser());
        }
        exam.generateHash();
        exam.update();

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamReviews(Long eid, List<String> statuses) {
        // Assure that ongoing exams will not be returned
        statuses.remove(Exam.State.STUDENT_STARTED.toString());
        List<Exam.State> states = statuses.stream().map(Exam.State::valueOf).collect(Collectors.toList());
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount")
                .fetch("exam.course", "code, credits")
                .fetch("exam.grade", "id, name")
                .fetch("reservation", "retrialPermitted")
                .where()
                .eq("exam.parent.id", eid)
                .in("exam.state", states)
                .findList();

        if (participations == null) {
            return notFound();
        } else {
            return ok(participations);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result listNoShows(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name, state, gradedTime, customCredit, trialCount")
                .fetch("reservation")
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam.course", "code, credits")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("exam.id", eid)
                .eq("reservation.noShow", true)
                .orderBy("reservation.endAt")
                .findList();
        if (enrolments == null) {
            return notFound();
        } else {
            return ok(enrolments);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamStudentInfo(Long eid) {

        ExamParticipation participation = Ebean.find(ExamParticipation.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .where()
                .eq("exam.id", eid)
                .findUnique();

        if (participation == null) {
            return notFound();
        } else {
            return ok(participation);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertComment(Long eid, Long cid) {

        Exam exam = Ebean.find(Exam.class, eid);
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Comment comment = bindForm(Comment.class);
        AppUtil.setCreator(comment, getLoggedUser());
        comment.save();

        exam.setExamFeedback(comment);
        exam.save();

        return ok(comment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateComment(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam.hasState(Exam.State.ABORTED, Exam.State.GRADED_LOGGED, Exam.State.ARCHIVED)) {
            return forbidden();
        }
        Comment form = bindForm(Comment.class);
        Comment comment = Ebean.find(Comment.class).fetch("creator", "firstName, lastName").where().idEq(cid).findUnique();
        if (comment == null) {
            return notFound();
        }
        if (form.getComment() != null) {
            AppUtil.setModifier(comment, getLoggedUser());
            comment.setComment(form.getComment());
            comment.save();
            exam.setExamFeedback(comment);
            exam.save();
        }
        return ok(comment);
    }

    private void notifyPartiesAboutPrivateExamPublication(Exam exam) {
        User sender = getLoggedUser();
        // Include participants, inspectors and owners. Exclude the sender.
        Set<User> users = exam.getExamEnrolments().stream().map(ExamEnrolment::getUser).collect(Collectors.toSet());
        users.addAll(exam.getExamInspections().stream().map(ExamInspection::getUser).collect(Collectors.toSet()));
        users.addAll(exam.getExamOwners());
        users.remove(sender);

        actor.scheduler().scheduleOnce(Duration.create(1, TimeUnit.SECONDS), () -> {
            for (User u : users)
                try {
                    emailComposer.composePrivateExamParticipantNotification(u, sender, exam);
                    Logger.info("Exam participation notification email sent to {}",
                            u.getEmail());
                } catch (IOException e) {
                    Logger.error("Failed to send participation notification email", e);
                }
        }, actor.dispatcher());
    }

    private Result updateStateAndValidate(Exam exam, DynamicForm df) {
        Exam.State state = df.get("state") == null ? null : Exam.State.valueOf(df.get("state"));
        if (state != null) {
            if (exam.hasState(Exam.State.PUBLISHED, Exam.State.PUBLISHED)) {
                // Exam is about to be published
                String str = ValidationUtil.validateExamForm(df);
                // invalid data
                if (!str.equalsIgnoreCase("OK")) {
                    return badRequest(str);
                }
                // no sections named
                if (exam.getExamSections().stream().anyMatch((section) -> section.getName() == null)) {
                    return badRequest("sitnet_exam_contains_unnamed_sections");
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id) {
        DynamicForm df = Form.form().bindFromRequest();

        Exam exam = createQuery().where().idEq(id).findUnique();

        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || getLoggedUser().hasRole("ADMIN")) {
            Result result = updateStateAndValidate(exam, df);
            if (result != null) {
                return result;
            }
            String examName = df.get("name");
            Boolean shared = Boolean.parseBoolean(df.get("shared"));
            String duration = df.get("duration");
            Integer grading = df.get("grading") == null ? null : Integer.parseInt(df.get("grading"));
            String answerLanguage = df.get("answerLanguage");
            String instruction = df.get("instruction");
            String enrollInstruction = df.get("enrollInstruction");
            Integer trialCount = df.get("trialCount") == null ? null : Integer.parseInt(df.get("trialCount"));
            boolean expanded = Boolean.parseBoolean(df.get("expanded"));
            if (examName != null) {
                exam.setName(examName);
            }
            exam.setShared(shared);
            Long start = new Long(df.get("examActiveStartDate"));
            Long end = new Long(df.get("examActiveEndDate"));
            if (start != 0) {
                exam.setExamActiveStartDate(new Date(start));
            }
            if (end != 0) {
                exam.setExamActiveEndDate(new Date(end));
            }
            if (duration != null) {
                exam.setDuration(Integer.valueOf(duration));
            }
            if (grading != null) {
                updateGrading(exam, grading);
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
            if (df.get("examType.type") != null) {
                String examType = df.get("examType.type");
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

            if (df.get("expanded") != null) {
                exam.setExpanded(expanded);
            }

            exam.save();
            return ok(exam);
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private static void updateGrading(Exam exam, int grading) {
        // Allow updating grading if allowed in settings or if course does not restrict the setting
        boolean canOverrideGrading = AppUtil.isCourseGradeScaleOverridable();
        if (canOverrideGrading || exam.getCourse().getGradeScale() == null) {
            GradeScale scale = Ebean.find(GradeScale.class, grading);
            if (scale != null) {
                exam.setGradeScale(Ebean.find(GradeScale.class, grading));
            } else {
                Logger.warn("Grade scale not found for ID {}. Not gonna update exam with it", grading);
            }
        }
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
                .fetch("examSections.sectionQuestions.question", "id, type, question, instruction, maxScore, maxCharacters, evaluationType, expanded")
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

    @Restrict({@Group("TEACHER")})
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

        exam.setExpanded(true);
        exam.save();

        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());
        ObjectNode typeNode = Json.newObject();
        typeNode.put("type", examExecutionType.getType());
        part.set("executionType", typeNode);
        return ok(Json.toJson(part));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertSection(Long id) {

        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            ExamSection section = bindForm(ExamSection.class);
            section.setExam(Ebean.find(Exam.class, id));
            AppUtil.setCreator(section, user);
            section.save();
            return ok(Json.toJson(section));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateCourse(Long eid, Long cid) {
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
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

        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            exam.setCourse(null);
            exam.save();
            return ok(Json.toJson(exam));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private Question clone(Long id) {
        User user = getLoggedUser();
        Question question = Ebean.find(Question.class, id).copy();
        AppUtil.setCreator(question, user);
        AppUtil.setModifier(question, user);
        question.save();
        Ebean.save(question.getOptions());
        return question;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reorderQuestion(Long eid, Long sid, Integer from, Integer to) {
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            ExamSection section = Ebean.find(ExamSection.class, sid);
            if (from.equals(to)) {
                return ok();
            }
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                int seq = esq.getSequenceNumber();
                if (seq == from) {
                    esq.setSequenceNumber(to);
                    esq.update();
                } else {
                    if (from > to) {
                        if (seq <= from && seq >= to) {
                            esq.setSequenceNumber(seq + 1);
                            esq.update();
                        }
                    } else {
                        if (seq >= from && seq <= to) {
                            esq.setSequenceNumber(seq - 1);
                            esq.update();
                        }
                    }
                }
            }
            return ok();
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertQuestion(Long eid, Long sid, Integer seq, Long qid) {
        Exam exam = Ebean.find(Exam.class, eid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        if (section == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            Question question = Ebean.find(Question.class, qid);
            switch (question.getType()) {
                case MultipleChoiceQuestion:
                    if (question.getOptions().size() < 2) {
                        return forbidden("sitnet_minimum_of_two_options_required");
                    }
                    if (!question.getOptions().stream().anyMatch(MultipleChoiceOption::isCorrectOption)) {
                        return forbidden("sitnet_correct_option_required");
                    }
                    break;
                case WeightedMultipleChoiceQuestion:
                    if (question.getOptions().size() < 2) {
                        return forbidden("sitnet_minimum_of_two_options_required");
                    }
                    break;
            }
            Question clone = clone(question.getId());

            // Assert that the sequence number provided is within limits
            if (seq < 0) {
                seq = 0;
            }
            if (seq > section.getSectionQuestions().size()) {
                seq = section.getSectionQuestions().size();
            }

            // Increase sequences for the entries above the inserted one
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                int sequenceNumber = esq.getSequenceNumber();
                if (sequenceNumber >= seq) {
                    esq.setSequenceNumber(sequenceNumber + 1);
                    esq.update();
                }
            }
            // Insert new section question
            ExamSectionQuestion sectionQuestion = new ExamSectionQuestion();
            sectionQuestion.setExamSection(section);
            sectionQuestion.setQuestion(clone);
            sectionQuestion.setSequenceNumber(seq);
            section.getSectionQuestions().add(sectionQuestion);
            AppUtil.setModifier(section, user);
            section.save();
            return ok(Json.toJson(section));
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertMultipleQuestions(Long eid, Long sid, Integer seq, String questions) {

        Exam exam = Ebean.find(Exam.class, eid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        if (section == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            for (String s : questions.split(",")) {
                Question question = Ebean.find(Question.class, Long.parseLong(s));
                Question clone = clone(question.getId());
                if (clone == null) {
                    return notFound("Question type not specified");
                }

                // Assert that the sequence number provided is within limits
                if (seq < 0) {
                    seq = 0;
                }
                if (seq > section.getSectionQuestions().size()) {
                    seq = section.getSectionQuestions().size();
                }

                // Increase sequences for the entries above the inserted one
                for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                    int sequenceNumber = esq.getSequenceNumber();
                    if (sequenceNumber >= seq) {
                        esq.setSequenceNumber(sequenceNumber + 1);
                        esq.update();
                    }
                }
                // Insert new section question
                ExamSectionQuestion sectionQuestion = new ExamSectionQuestion();
                sectionQuestion.setExamSection(section);
                sectionQuestion.setQuestion(clone);
                sectionQuestion.setSequenceNumber(seq);
                section.getSectionQuestions().add(sectionQuestion);
                AppUtil.setModifier(section, user);
                section.save();
            }
            section = Ebean.find(ExamSection.class, sid);
            return ok(Json.toJson(section));
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeQuestion(Long eid, Long sid, Long qid) {
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            Question question = Ebean.find(Question.class, qid);
            ExamSection section = Ebean.find(ExamSection.class)
                    .fetch("sectionQuestions")
                    .where()
                    .eq("id", sid)
                    .findUnique();
            ExamSectionQuestion sectionQuestion = Ebean.find(ExamSectionQuestion.class).where().eq("question",
                    question).eq("examSection", section).findUnique();
            if (sectionQuestion == null) {
                return notFound("sitnet_error_not_found");
            }
            // Detach possible student exam questions from this one
            List<Question> children = Ebean.find(Question.class)
                    .where()
                    .eq("parent.id", sectionQuestion.getQuestion().getId())
                    .findList();
            for (Question child : children) {
                child.setParent(null);
                child.save();
            }
            sectionQuestion.delete();
            section.getSectionQuestions().remove(sectionQuestion);

            // Decrease sequences for the entries above the inserted one
            int seq = sectionQuestion.getSequenceNumber();
            for (ExamSectionQuestion esq : section.getSectionQuestions()) {
                int num = esq.getSequenceNumber();
                if (num >= seq) {
                    esq.setSequenceNumber(num - 1);
                    esq.update();
                }
            }
            section.save();
            return ok(Json.toJson(section));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result clearQuestions(Long sid) {
        ExamSection section = Ebean.find(ExamSection.class, sid);
        User user = getLoggedUser();
        if (section.getExam().isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            section.getSectionQuestions().forEach(models.ExamSectionQuestion::delete);
            section.getSectionQuestions().clear();
            section.save();
            return ok(Json.toJson(section));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeSection(Long eid, Long sid) {
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            ExamSection section = Ebean.find(ExamSection.class, sid);
            exam.getExamSections().remove(section);
            exam.save();

            // clear parent id from children
            for (ExamSectionQuestion examSectionQuestion : section.getSectionQuestions()) {
                for (Question abstractQuestion : examSectionQuestion.getQuestion().getChildren()) {
                    abstractQuestion.setParent(null);
                    abstractQuestion.update();
                }
            }
            section.delete();

            return ok();
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateSection(Long eid, Long sid) {

        // TODO: should check is user is owner ?
        ExamSection section = Form.form(ExamSection.class).bindFromRequest(
                "id",
                "name",
                "expanded",
                "lotteryOn",
                "lotteryItemCount"
        ).get();

        ExamSection sectionToUpdate = Ebean.find(ExamSection.class, sid);
        sectionToUpdate.setName(section.getName());
        sectionToUpdate.setExpanded(section.getExpanded());
        sectionToUpdate.setLotteryOn(section.getLotteryOn());
        sectionToUpdate.setLotteryItemCount(section.getLotteryItemCount());
        sectionToUpdate.update();

        return ok(Json.toJson(sectionToUpdate));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamSections(Long examid) {
        Exam exam = Ebean.find(Exam.class, examid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            List<ExamSection> sections = Ebean.find(ExamSection.class).where()
                    .eq("id", examid)
                    .findList();
            return ok(Json.toJson(sections));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteSection(Long sectionId) {
        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("examSections.id", sectionId)
                .findUnique();
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN")) {
            ExamSection section = Ebean.find(ExamSection.class, sectionId);
            exam.getExamSections().remove(section);
            exam.save();
            section.delete();
            return ok("removed");
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
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("user", "id")
                .fetch("user.language")
                .fetch("reservation.machine.room", "roomInstruction, roomInstructionEN, roomInstructionSV")
                .where()
                .eq("exam.id", eid)
                .findUnique();

        if (enrolment == null) {
            return notFound();
        } else {
            return ok(enrolment);
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getParticipationsForExamAndUser(Long eid, Long uid) {
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam", "id, state")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("user.id", uid)
                .eq("exam.parent.id", eid)
                .disjunction()
                .eq("exam.state", Exam.State.ABORTED)
                .eq("exam.state", Exam.State.GRADED)
                .eq("exam.state", Exam.State.GRADED_LOGGED)
                .eq("exam.state", Exam.State.ARCHIVED)
                .endJunction()
                .findList();
        return ok(participations);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result getEnrolmentsForExam(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam", "id, name")
                .fetch("exam.course", "code")
                .fetch("user", "id")
                .fetch("reservation", "startAt")
                .fetch("reservation.machine", "name")
                .where()
                .eq("exam.id", eid)
                .findList();
        return ok(enrolments);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getReservationInformationForExam(Long eid) {
        ExamEnrolment enrolment = Ebean.find(ExamEnrolment.class)
                .fetch("reservation")
                .fetch("reservation.machine")
                .fetch("reservation.machine.room")
                .where()
                .eq("exam.id", eid)
                .findUnique();
        if (enrolment == null || enrolment.getReservation() == null) {
            return notFound();
        }
        ExamMachine machine = enrolment.getReservation().getMachine();
        return ok(machine);
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

        List<User> owners;

        Exam exam = Ebean.find(Exam.class, id);

        if (exam != null && exam.getParent() != null) {
            owners = exam.getParent().getExamOwners();
        } else if (exam == null) {
            return notFound();
        } else {
            owners = exam.getExamOwners();
        }
        return ok(owners);
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
    public Result getInspections() {
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("exam", "id, name")
                .fetch("user", "id")
                .findList();
        return ok(inspections);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

        if (owner != null && exam != null) {
            try {
                exam.getExamOwners().add(owner);
                exam.update();
            } catch (Exception e) {
                return internalServerError("error adding exam owner. " + e.getMessage());
            }
            return ok();
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeExamOwner(Long eid, Long uid) {

        final User owner = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

        if (owner != null && exam != null) {
            try {
                if (exam.getExamOwners() != null && exam.getExamOwners().size() > 1) {
                    exam.getExamOwners().remove(owner);
                    exam.update();
                }
            } catch (Exception e) {
                return internalServerError("error removing exam owner. " + e.getMessage());
            }
            return ok();
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertInspection(Long eid, Long uid) {

        final ExamInspection inspection = bindForm(ExamInspection.class);
        final User recipient = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);
        // Name required before adding inspectors
        if (exam.getName() == null) {
            return badRequest("sitnet_exam_name_missing_or_too_short");
        }

        if (exam.getParent() == null) {
            inspection.setExam(exam);
        } else {
            inspection.setExam(exam.getParent());
        }
        inspection.setUser(recipient);
        inspection.setAssignedBy(getLoggedUser());

        if (inspection.getComment() != null) {
            inspection.setComment((Comment) AppUtil.setCreator(inspection.getComment(), getLoggedUser()));
            inspection.getComment().save();
        }
        inspection.save();

        if (inspection.getComment() != null &&
                inspection.getComment().getComment() != null &&
                !inspection.getComment().getComment().isEmpty()) {
            try {
                emailComposer.composeExamReviewRequest(recipient, getLoggedUser(), exam,
                        inspection.getComment().getComment());
            } catch (IOException e) {
                Logger.error("Failure to access message template on disk", e);
                e.printStackTrace();
            }
        }

        // add to child exams
        for (Exam child : exam.getChildren()) {
            if (child.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED)) {
                continue;
            }
            for (ExamInspection ei : child.getExamInspections()) {
                if (ei.getUser().equals(recipient)) {
                    break;
                }
            }

            ExamInspection i = new ExamInspection();
            i.setExam(child);
            i.setUser(recipient);
            i.setAssignedBy(getLoggedUser());
            i.save();
        }

        return ok(Json.toJson(inspection));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteInspection(Long id) {
        ExamInspection inspection = Ebean.find(ExamInspection.class, id);
        User inspector = inspection.getUser();
        Exam exam = inspection.getExam();
        for (Exam child : exam.getChildren()) {
            if (child.hasState(Exam.State.GRADED, Exam.State.GRADED_LOGGED)) {
                continue;
            }
            for (ExamInspection ei : child.getExamInspections()) {
                if (ei.getUser().equals(inspector)) {
                    ei.delete();
                    break;
                }
            }
        }
        inspection.delete();
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateInspection(Long id, boolean ready) {

        ExamInspection inspection = Ebean.find(ExamInspection.class, id);

        if (inspection == null) {
            return notFound();
        }
        inspection.setReady(ready);
        inspection.update();

        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result sendInspectionMessage(Long eid) {

        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        JsonNode body = request().body().asJson();
        if (!body.has("msg")) {
            return badRequest("no message received");
        }
        User loggedUser = getLoggedUser();
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("user")
                .fetch("exam")
                .where()
                .eq("exam.id", exam.getId())
                .ne("user.id", loggedUser.getId())
                .findList();

        Set<User> recipients = inspections.stream().map(ExamInspection::getUser).collect(Collectors.toSet());

        // add owners to list, except those how are already in the list and self
        if (exam.getParent() != null) {
            for (User owner : exam.getParent().getExamOwners()) {
                if (owner.equals(loggedUser)) {
                    continue;
                }
                recipients.add(owner);
            }
        }
        try {
            for (User user : recipients) {
                emailComposer.composeInspectionMessage(user, loggedUser, exam, body.get("msg").asText());
            }
        } catch (IOException e) {
            Logger.error("Failure to access message template on disk", e);
            return internalServerError("sitnet_internal_error");
        }
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertLocalInspectionWithoutCommentAndEmail(Long eid, Long uid) {

        ExamInspection inspection = new ExamInspection();
        final User recipient = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

        if (recipient == null || exam == null) {
            return notFound();
        }
        inspection.setExam(exam);
        inspection.setUser(recipient);
        inspection.setAssignedBy(getLoggedUser());

        inspection.save();
        return ok(inspection);
    }

    @Restrict({@Group("TEACHER")})
    public Result archiveExams() {
        List<String> ids = parseArrayFieldFromBody("ids");
        if (ids.isEmpty()) {
            return badRequest();
        }
        List<Exam> exams = Ebean.find(Exam.class).where()
                .eq("state", Exam.State.GRADED_LOGGED)
                .idIn(ids)
                .findList();
        for (Exam e : exams) {
            e.setState(Exam.State.ARCHIVED);
            e.update();
        }
        return ok();
    }


    private static boolean isEligibleForArchiving(Exam exam, Date start, Date end) {
        return exam.hasState(Exam.State.ABORTED, Exam.State.REVIEW, Exam.State.REVIEW_STARTED)
                && !(start != null && exam.getCreated().before(start))
                && !(end != null && exam.getCreated().after(end));
    }

    private static void createSummaryFile(ArchiveOutputStream aos, Date start, Date end, Exam exam,
                                          Map<Long, String> questions) throws IOException {
        File file = File.createTempFile("summary", ".txt");
        FileOutputStream fos = new FileOutputStream(file);
        BufferedWriter writer = new BufferedWriter(new OutputStreamWriter(fos));
        DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
        writer.write(String.format("period: %s-%s", df.format(start), df.format(end)));
        writer.newLine();
        writer.write(String.format("exam id: %d", exam.getId()));
        writer.newLine();
        writer.write(String.format("exam name: %s", exam.getName()));
        writer.newLine();
        writer.newLine();
        writer.write("questions");
        writer.newLine();
        for (Map.Entry<Long, String> entry : questions.entrySet()) {
            writer.write(String.format("%d: %s", entry.getKey(), Jsoup.parse(entry.getValue()).text()));
            writer.newLine();
        }
        writer.close();
        TarArchiveEntry entry = new TarArchiveEntry("summary.txt");
        entry.setSize(file.length());
        aos.putArchiveEntry(entry);
        IOUtils.copy(new FileInputStream(file), aos);
        aos.closeArchiveEntry();
    }

    private void createArchive(Exam prototype, ArchiveOutputStream aos, Date start, Date end) throws IOException {
        List<Exam> children = prototype.getChildren().stream().filter(
                (e) -> isEligibleForArchiving(e, start, end)).collect(Collectors.toList());
        Map<Long, String> questions = new LinkedHashMap<>();
        for (Exam exam : children) {
            String uid = exam.getCreator().getUserIdentifier() == null ?
                    exam.getCreator().getId().toString() : exam.getCreator().getUserIdentifier();
            for (ExamSection es : exam.getExamSections()) {
                for (ExamSectionQuestion esq : es.getSectionQuestions()) {
                    questions.put(esq.getQuestion().getId(), esq.getQuestion().getQuestion());
                    Long questionId = esq.getQuestion().getParent().getId();
                    Answer answer = esq.getQuestion().getAnswer();
                    Attachment attachment;
                    File file = null;
                    if (answer != null && (attachment = answer.getAttachment()) != null) {
                        // attached answer
                        String fileName = attachment.getFileName();
                        file = new File(String.format("%s/%s", attachment.getFilePath(), fileName));
                        if (file.exists()) {
                            String entryName = String.format("%d/%d/%s/%s", prototype.getId(), questionId, uid, fileName);
                            TarArchiveEntry entry = new TarArchiveEntry(entryName);
                            entry.setSize(file.length());
                            aos.putArchiveEntry(entry);
                            IOUtils.copy(new FileInputStream(file), aos);
                        } else {
                            Logger.warn("Attachment {} is not connected to a file on disk!", attachment.getId());
                        }
                    }
                    if (file == null || !file.exists()) {
                        // no attached answer, create empty directory
                        String entryName = String.format("%d/%d/%s/", prototype.getId(), questionId, uid);
                        TarArchiveEntry entry = new TarArchiveEntry(entryName);
                        aos.putArchiveEntry(entry);
                    }
                    aos.closeArchiveEntry();
                }
            }
        }
        createSummaryFile(aos, start, end, prototype, questions);
    }

    @Restrict({@Group("ADMIN"), @Group("TEACHER")})
    public Result getArchivedAttachments(Long eid, F.Option<String> start, F.Option<String> end) throws IOException {
        Exam prototype = Ebean.find(Exam.class, eid);
        if (prototype == null) {
            return notFound();
        }
        Date startDate = null;
        Date endDate = null;
        try {
            DateFormat df = new SimpleDateFormat("dd.MM.yyyy");
            if (start.isDefined() && !start.isEmpty()) {
                startDate = new DateTime(df.parse(start.get())).withTimeAtStartOfDay().toDate();
            }
            if (end.isDefined() && !end.isEmpty()) {
                endDate = new DateTime(df.parse(end.get())).withTimeAtStartOfDay().plusDays(1).toDate();
            }
        } catch (ParseException e) {
            return badRequest();
        }
        File tarball = File.createTempFile(eid.toString(), ".tar.gz");
        try (ArchiveOutputStream aos = new TarArchiveOutputStream(
                new GZIPOutputStream(
                        new BufferedOutputStream(
                                new FileOutputStream(tarball))))) {
            createArchive(prototype, aos, startDate, endDate);
            if (aos.getBytesWritten() == 0) {
                return notFound("sitnet_no_attachments_to_archive");
            }
        } catch (IOException e) {
            Logger.error("Failed in creating a tarball", e);
        }
        response().setHeader("Content-Disposition", "attachment; filename=\"" + tarball.getName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(tarball).toByteArray()));
    }

}
