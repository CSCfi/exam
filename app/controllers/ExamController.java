package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import exceptions.MalformedDataException;
import exceptions.SitnetException;
import models.*;
import models.questions.MultipleChoiseOption;
import models.questions.Question;
import org.joda.time.DateTime;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.F;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;
import util.java.EmailComposer;
import util.java.ValidationUtil;

import javax.inject.Inject;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;


public class ExamController extends BaseController {

    @Inject
    protected EmailComposer emailComposer;


    private static ExpressionList<Exam> createPrototypeQuery() {
        return Ebean.find(Exam.class)
                .fetch("course")
                .fetch("creator")
                .fetch("examSections")
                .fetch("parent").where()
                .disjunction()
                .eq("state", Exam.State.PUBLISHED.toString())
                .eq("state", Exam.State.SAVED.toString())
                .eq("state", Exam.State.DRAFT.toString())
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
                .fetch("examInspections")
                .fetch("examInspections.user", "id, firstName, lastName")
                .fetch("examInspections.assignedBy", "id")
                .fetch("examEnrolments")
                .fetch("examEnrolments.user", "id")
                .fetch("examEnrolments.reservation", "id")
                .fetch("course")
                .where()
                .eq("state", Exam.State.PUBLISHED.toString())
                .disjunction()
                .eq("examInspections.user", user)
                .eq("examInspections.assignedBy", user)
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

            // check if exam has children
            // if true, we cannot delete it because children exams reference this exam
            // so we just set it ARCHIVED
            int count = Ebean.find(Exam.class)
                    .where()
                    .eq("parent.id", id)
                    .findRowCount();

            if (count > 0) {
                exam.setState(Exam.State.ARCHIVED.name());
                exam = (Exam) AppUtil.setModifier(exam, user);
                exam.save();
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
                exam.setState(Exam.State.DELETED.name());
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
                .fetch("examSections")
                .fetch("examSections.sectionQuestions")
                .fetch("examSections.sectionQuestions.question")
                .fetch("examSections.sectionQuestions.question.attachment")
                .fetch("examSections.sectionQuestions.question.options")
                .fetch("examSections.sectionQuestions.question.answer")
                .fetch("examSections.sectionQuestions.question.answer.attachment")
                .fetch("examSections.sectionQuestions.question.answer.option")
                .fetch("gradeScale")
                .fetch("gradeScale.grades")
                .fetch("grade")
                .fetch("examFeedback")
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
                .eq("state", Exam.State.DRAFT.toString())
                .eq("state", Exam.State.SAVED.toString())
                .eq("state", Exam.State.PUBLISHED.toString())
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
                .eq("state", Exam.State.ABORTED.toString())
                .eq("state", Exam.State.REVIEW.toString())
                .eq("state", Exam.State.REVIEW_STARTED.toString())
                .eq("state", Exam.State.GRADED.toString())
                .eq("state", Exam.State.GRADED_LOGGED.toString())
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
        exam.setState(df.get("state"));

        if (df.get("customCredit") != null) {
            exam.setCustomCredit(Double.parseDouble(df.get("customCredit")));
        } else {
            exam.setCustomCredit(null);
        }
        // set user only if exam is really graded, not just modified
        if (exam.getState().equals(Exam.State.GRADED.name()) || exam.getState().equals(Exam.State.GRADED_LOGGED.name())) {
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
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("user", "id, firstName, lastName, email, userIdentifier")
                .fetch("exam", "id, name, state, gradedTime, customCredit")
                .fetch("exam.course", "code, credits")
                .fetch("exam.grade", "id, name")
                .where()
                .eq("exam.parent.id", eid)
                .in("exam.state", statuses)
                .findList();

        if (participations == null) {
            return notFound();
        } else {
            return ok(participations);
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
    public Result insertComment(Long eid, Long cid) throws MalformedDataException {

        Comment comment = bindForm(Comment.class);
        AppUtil.setCreator(comment, getLoggedUser());
        comment.save();

        Exam exam = Ebean.find(Exam.class, eid);
        exam.setExamFeedback(comment);
        exam.save();

        return ok(comment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateComment(Long eid, Long cid) throws MalformedDataException {

        Comment form = bindForm(Comment.class);
        Comment comment = Ebean.find(Comment.class).fetch("creator", "firstName, lastName").where().idEq(cid).findUnique();
        if (comment == null) {
            return notFound();
        }
        if (form.getComment() != null) {
            AppUtil.setModifier(comment, getLoggedUser());
            comment.setComment(form.getComment());
            comment.save();
            Exam exam = Ebean.find(Exam.class, eid);
            exam.setExamFeedback(comment);
            exam.save();
        }
        return ok(comment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateExam(Long id) {
        DynamicForm df = Form.form().bindFromRequest();

        Exam exam = createQuery().where()
                .idEq(id).findUnique();

        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || getLoggedUser().hasRole("ADMIN")) {
            String str = ValidationUtil.validateExamForm(df);
            if (!str.equalsIgnoreCase("OK")) {
                return badRequest(str);
            }
            String examName = df.get("name");
            Boolean shared = Boolean.parseBoolean(df.get("shared"));
            String duration = df.get("duration");
            Integer grading = df.get("grading") == null ? null : Integer.parseInt(df.get("grading"));
            String answerLanguage = df.get("answerLanguage");
            String instruction = df.get("instruction");
            String enrollInstruction = df.get("enrollInstruction");
            String state = df.get("state");
            boolean expanded = Boolean.parseBoolean(df.get("expanded"));
            if (examName != null) {
                exam.setName(examName);
            }
            if (state != null) {
                exam.setState(state);
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
            exam.setGradeScale(Ebean.find(GradeScale.class, grading));
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
    public Result updateExamSoftwareInfo(Long eid, Long sid) {
        Exam exam = Ebean.find(Exam.class, eid);
        Software software = Ebean.find(Software.class, sid);

        exam.getSoftwareInfo().add(software);
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addExamLanguage(Long eid, String code) {
        Exam exam = Ebean.find(Exam.class, eid);
        Language language = Ebean.find(Language.class, code);

        exam.getExamLanguages().add(language);
        exam.update();

        return ok(Json.toJson(exam));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result createExamDraft() {
        User user = getLoggedUser();
        Exam exam = new Exam();
        exam.setName("Kirjoita tentin nimi tähän"); // TODO: i18n
        exam.setState(Exam.State.DRAFT.toString());
        AppUtil.setCreator(exam, user);
        exam.save();

        ExamSection examSection = new ExamSection();
        examSection.setName("Aihealue"); // TODO: i18n
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

        // return only id, its all we need at this point
        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());

        return ok(Json.toJson(part));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertSection(Long id) throws MalformedDataException {

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
            if (question.getType().equals(Question.Type.MultipleChoiceQuestion.toString())) {
                if (question.getOptions().size() < 2) {
                    return forbidden("sitnet_minimum_of_two_options_required");
                }
                if (!question.getOptions().stream().anyMatch(MultipleChoiseOption::isCorrectOption)) {
                    return forbidden("sitnet_correct_option_required");
                }
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
                .fetch("user.userLanguage")
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
                .eq("exam.state", Exam.State.ABORTED.toString())
                .eq("exam.state", Exam.State.GRADED.toString())
                .eq("exam.state", Exam.State.GRADED_LOGGED.toString())
                .eq("exam.state", Exam.State.ARCHIVED.toString())
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
                .eq("exam.state", "ABORTED")
                .eq("exam.state", "REVIEW")
                .eq("exam.state", "REVIEW_STARTED")
                .eq("exam.state", "GRADED")
                .eq("exam.state", "GRADED_LOGGED")
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
    public Result insertInspection(Long eid, Long uid) throws SitnetException {

        final ExamInspection inspection = bindForm(ExamInspection.class);
        final User recipient = Ebean.find(User.class, uid);
        final Exam exam = Ebean.find(Exam.class, eid);

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
            if (child.getState().equals(Exam.State.GRADED.toString()) || child.getState().equals(
                    Exam.State.GRADED_LOGGED.toString())) {
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

        ExamInspection inspection = Ebean.find(ExamInspection.class).fetch("exam").fetch("exam.examInspections").where().eq("id", id).findUnique();
        User inspector = inspection.getUser();
        Exam exam = inspection.getExam();
        for (Exam child : exam.getChildren()) {
            if (child.getState().equals(Exam.State.GRADED.toString()) || child.getState().equals(
                    Exam.State.GRADED_LOGGED.toString())) {
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

}
