package controllers;

import Exceptions.MalformedDataException;
import Exceptions.SitnetException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.Expr;
import com.avaje.ebean.FetchConfig;
import com.avaje.ebean.Query;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import com.fasterxml.jackson.databind.node.ObjectNode;
import models.*;
import models.questions.AbstractQuestion;
import models.questions.EssayQuestion;
import models.questions.MultipleChoiceQuestion;
import models.questions.MultipleChoiseOption;
import play.Logger;
import play.data.DynamicForm;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.SitnetUtil;
import util.java.EmailComposer;
import java.sql.Timestamp;
import java.util.*;

public class ExamController extends SitnetController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result getExams() {

        Logger.debug("getExams()");

        String oql = null;
        Query<Exam> query = null;

        User user = UserController.getLoggedUser();
        if(user.hasRole("TEACHER")) {
            oql = "find exam " +
                  "fetch examSections " +
                  "fetch course " +
                  "where (state=:published or state=:saved or state=:draft) " +
                  "and (shared=:is_shared or creator.id=:myid)";
//                  "and (shared:shared or creator.id:myid)";

            query = Ebean.createQuery(Exam.class, oql);
            query.setParameter("published", "PUBLISHED");
            query.setParameter("saved", "SAVED");
            query.setParameter("draft", "DRAFT");
            query.setParameter("is_shared", true);
            query.setParameter("myid", user.getId());
        }
        else if (user.hasRole("ADMIN")) {

            oql = "find exam "
                    + " fetch examSections "
                    + " fetch course "
                    + " where state=:published or state=:saved or state=:draft";

            query = Ebean.createQuery(Exam.class, oql);
            query.setParameter("published", "PUBLISHED");
            query.setParameter("saved", "SAVED");
            query.setParameter("draft", "DRAFT");
        }


        List<Exam> exams = query.findList();

        return ok(Json.toJson(exams));
    }

    public static Result getExamsByState(String state) {
        Logger.debug("getExamsByState()");

//        User user = UserController.getLoggedUser();

        String oql =
                "  find  exam "
                        + " fetch examSections "
                        + " fetch course "
                        + " where state=:examstate";

        Query<Exam> query = Ebean.createQuery(Exam.class, oql);
        query.setParameter("examstate", state);

        // Todo: Uncomment when student_id gets set to the EXAM table
        //query.setParameter("userid", user.getId());

        List<Exam> exams = query.findList();

        return ok(Json.toJson(exams));
    }

    public static Result getActiveExams() {
        Logger.debug("getActiveExams()");

        User user = UserController.getLoggedUser();

        Date date = new Date();
        Timestamp timestamp = new Timestamp(date.getTime());

        // Todo: Oletetaan että tentin luoja on automaattisesti tentin tarkastaja
        List<Exam> activeExams = Ebean.find(Exam.class)
                .where()
                .eq("creator.id", user.getId())
                .betweenProperties("examActiveStartDate", "examActiveEndDate", timestamp)
                .findList();

        // Todo: Hae tentit joissa tämä käyttäjä on tarkastaja, palauta JSON propertiesilla

//        List<ExamEnrolment> enrolments =


//        JsonContext jsonContext = Ebean.createJsonContext();
//        JsonWriteOptions options = new JsonWriteOptions();
//        options.setRootPathProperties("id, name, examActiveEndDate");
//        options.setPathProperties("course", "code");
//        options.setPathProperties("reservation", "startAt, machine");
//        options.setPathProperties("reservation.machine", "name");

//        ObjectNode result = Json.newObject();
//        result.put("id", user.getId());
//        result.put("name", name);
//        result.put("firstname", user.getFirstName());
//        result.put("lastname", user.getLastName());
//        result.put("roles", Json.toJson(user.getRoles()));

        for (Exam exam : activeExams) {

            int enrolmentCount = Ebean.find(ExamEnrolment.class)
                    .where()
                    .eq("exam.id", exam.getId())
                    .findRowCount();

            Logger.debug("count");
        }

//        return ok(jsonContext.toJsonString(activeExams, true, options)).as("application/json");

        // For some reason conjuction didn't do AND to the lt and gt expressions. Individually both works
//        Query q = Ebean.createQuery(Exam.class);
//        q.where().conjunction()
//                .add(Expr.lt("examActiveStartDate", timestamp))
//                .add(Expr.gt("examActiveEndDate", timestamp));

//        List<Exam> activeExams = q.findList();

        return ok(Json.toJson(activeExams));
    }

    public static Result getFinishedExams() {
        Logger.debug("getFinishedExams()");

        Date date = new Date();
        Timestamp timestamp = new Timestamp(date.getTime());

        List<Exam> finishedExams = Ebean.find(Exam.class)
                .where()
                .lt("examActiveEndDate", timestamp)
                .findList();

        return ok(Json.toJson(finishedExams));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteExam(Long id) {

        User user = UserController.getLoggedUser();
        Exam exam = Ebean.find(Exam.class, id);

        if(user.hasRole("ADMIN") || SitnetUtil.isOwner(exam))
        {
            Ebean.delete(Exam.class, id);
            return ok("Exam deleted from database!");
        }
        else
            return forbidden("You don't have the permission to modify this object");

    }

    public static Result getExam(Long id) {
        Logger.debug("getExam(:id)");

        Query<Exam> query = Ebean.createQuery(Exam.class);
        query.fetch("course");
        query.fetch("examSections");
        query.setId(id);

        Exam exam = query.findUnique();

        return ok(Json.toJson(exam));
    }

    public static Result reviewExam(Long id) {
        Logger.debug("reviewExam(:id)");

        DynamicForm df = Form.form().bindFromRequest();

        Exam ex = Form.form(Exam.class).bindFromRequest(
                "id",
                "instruction",
                "name",
                "shared",
                "state",
                "room",
                "duration",
                "grading",
                "otherGrading",
                "totalScore",
                "examLanguage",
                "answerLanguage",
                "grade",
                "creditType",
                "expanded")
                .get();

        ex.generateHash();
        ex.update();

        return ok(Json.toJson(ex));
    }

    public static Result insertComment(Long eid, Long cid) throws MalformedDataException {
        Logger.debug("insertComment()");

        Comment bindComment = bindForm(Comment.class);

        Exam exam = Ebean.find(Exam.class, eid);

        Comment newComment = new Comment();
        newComment.setComment(bindComment.getComment());
        newComment.save();

        exam.setExamFeedback(newComment);
        exam.save();

        JsonContext jsonContext = Ebean.createJsonContext();
        JsonWriteOptions options = new JsonWriteOptions();
        options.setRootPathProperties("id, comment, creator");
        options.setPathProperties("creator", "id, firstName, lastName");

        return ok(jsonContext.toJsonString(newComment, true, options)).as("application/json");

//        Query<Exam> query = Ebean.createQuery(Exam.class);
//        query.fetch("examFeedback");
//        query.setId(eid);

    }

    public static Result updateComment(Long eid, Long cid) throws MalformedDataException {
        Logger.debug("updateComment()");

        Comment bindComment = bindForm(Comment.class);

        Comment comment = Ebean.find(Comment.class, cid);

        try {
            comment = (Comment) SitnetUtil.setCreator(comment);
        } catch (SitnetException e) {
            e.printStackTrace();
        }
        comment.setComment(bindComment.getComment());
        comment.save();

        Exam exam = Ebean.find(Exam.class, eid);

        exam.setExamFeedback(comment);
        exam.save();

        if (comment == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, comment, creator");
            options.setPathProperties("creator", "id, firstName, lastName");

            return ok(jsonContext.toJsonString(comment, true, options)).as("application/json");
        }
    }

    public static Result updateExam(Long id) throws MalformedDataException {

        DynamicForm df = Form.form().bindFromRequest();

        Long start = new Long(df.get("examActiveStartDate"));
        Long end = new Long(df.get("examActiveEndDate"));

        Exam ex = Form.form(Exam.class).bindFromRequest(
                "id",
                "instruction",
                "name",
                "shared",
                "state",
                "room",
                "duration",
                "grading",
                "examLanguage",
                "answerLanguage",
                "expanded")
                .get();

        if (SitnetUtil.isOwner(ex)) {
            ex.setExamActiveStartDate(new Timestamp(start));
            ex.setExamActiveEndDate(new Timestamp(end));

            try {
                SitnetUtil.setModifier(ex);
            } catch (SitnetException e) {
                e.printStackTrace();
            }
            ex.generateHash();
            ex.update();

            return ok(Json.toJson(ex));
        } else
            return notFound("Sinulla ei oikeuksia muokata tätä objektia");
    }

    public static Result createExamDraft() throws MalformedDataException {
        Logger.debug("createExamDraft()");

        Exam exam = new Exam();
        exam.setName("Kirjoita tentin nimi tähän");
        exam.setState("DRAFT");
        try {
            SitnetUtil.setCreator(exam);
        } catch (SitnetException e) {
            e.printStackTrace();
            return ok(e.getMessage());
        }
        exam.save();

        ExamSection examSection = new ExamSection();
        examSection.setName("Osio");
        try {
            SitnetUtil.setCreator(examSection);
        } catch (SitnetException e) {
            e.printStackTrace();
            return ok(e.getMessage());
        }
        examSection.setExam(exam);
        examSection.setExpanded(true);
        examSection.save();

        exam.getExamSections().add(examSection);
        exam.setExamLanguage("fi");

        exam.save();

        // lisätään tentin luoja tarkastajiin (SITNET-178)
        ExamInspection inspection = new ExamInspection();
        inspection.setExam(exam);
        inspection.setUser(UserController.getLoggedUser());
        inspection.save();

        ObjectNode part = Json.newObject();
        part.put("id", exam.getId());

        return ok(Json.toJson(part));
    }

    public static Result insertSection(Long id) throws MalformedDataException {
        Logger.debug("insertSection()");

        ExamSection section = bindForm(ExamSection.class);
        section.setExam(Ebean.find(Exam.class, id));
        try {
            section = (ExamSection) SitnetUtil.setCreator(section);
        } catch (SitnetException e) {
            e.printStackTrace();
            return ok(e.getMessage());
        }

        section.save();

        return ok(Json.toJson(section));
    }

    public static Result updateCourse(Long eid, Long cid) throws MalformedDataException {
        Logger.debug("updateCourse()");

        Exam exam = Ebean.find(Exam.class, eid);
        Course course = Ebean.find(Course.class, cid);

        exam.setCourse(course);
        exam.save();

        return ok(Json.toJson(exam));
    }

    public static Result insertQuestion(Long eid, Long sid, Long qid) throws MalformedDataException {
        Logger.debug("insertQuestion()");

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, qid);

        switch (question.getType()) {
            case "MultipleChoiceQuestion": {
                MultipleChoiceQuestion multiQuestion = Ebean.find(MultipleChoiceQuestion.class, qid);
                MultipleChoiceQuestion clonedQuestion;
                clonedQuestion = (MultipleChoiceQuestion)multiQuestion.clone();
                clonedQuestion.setParent(multiQuestion);
                try {
                    clonedQuestion = (MultipleChoiceQuestion) SitnetUtil.setCreator(clonedQuestion);
                } catch (SitnetException e) {
                    e.printStackTrace();
                }
                clonedQuestion.setOptions(new ArrayList<MultipleChoiseOption>());
                clonedQuestion.save();
                List<MultipleChoiseOption> options = multiQuestion.getOptions();
                for (MultipleChoiseOption o : options) {
                    MultipleChoiseOption clonedOpt = (MultipleChoiseOption) o.clone();
                    clonedOpt.setQuestion(clonedQuestion);
                    clonedOpt.save();
                    clonedQuestion.getOptions().add(clonedOpt);
                }

                ExamSection section = Ebean.find(ExamSection.class, sid);
                section.getQuestions().add(clonedQuestion);
                section.save();

                return ok(Json.toJson(section));
            }
            case "EssayQuestion": {
                EssayQuestion essayQuestion = Ebean.find(EssayQuestion.class, qid);
                EssayQuestion clonedQuestion;
                clonedQuestion = (EssayQuestion)essayQuestion.clone();
                clonedQuestion.save();

                ExamSection section = Ebean.find(ExamSection.class, sid);
                section.getQuestions().add(clonedQuestion);
                section.save();

                return ok(Json.toJson(section));
            }
        }

        return ok(Json.toJson(null));

    }

    public static Result removeQuestion(Long eid, Long sid, Long qid) throws MalformedDataException {
        Logger.debug("insertQuestion()");

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, qid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        section.getQuestions().remove(question);
        section.save();

        return ok(Json.toJson(section));
    }

    public static Result removeSection(Long eid, Long sid) {
        Logger.debug("insertQuestion()");

        Exam exam = Ebean.find(Exam.class, eid);

        ExamSection section = Ebean.find(ExamSection.class, sid);
        exam.getExamSections().remove(section);
        exam.save();
        section.delete();
        return ok();
    }

    public static Result updateSection(Long eid, Long sid) {
        Logger.debug("insertQuestion()");

        ExamSection section = Form.form(ExamSection.class).bindFromRequest(
                "id",
                "name",
                "expanded"
        ).get();

        section.update();

        return ok();
    }


    //  @Authenticate
//    @Restrict(@Group({"TEACHER"}))
    public static Result createExam() throws MalformedDataException {
        Logger.debug("createExam()");

        Exam ex = bindForm(Exam.class);

        switch (ex.getState()) {
            case "DRAFT": {
                ex.setId(null);
                try {
                    SitnetUtil.setCreator(ex);
                } catch (SitnetException e) {
                    e.printStackTrace();
                    return ok(e.getMessage());
                }
                ex.save();

                return ok(Json.toJson(ex));
            }
            case "PUBLISHED": {

                List<ExamSection> examSections = ex.getExamSections();
                for (ExamSection es : examSections) {
                    es.setId(null);
//            		es.save();

                    List<AbstractQuestion> questions = es.getQuestions();
                    for (AbstractQuestion q : questions) {
                        q.setId(null);
//                		q.save();

                        switch (q.getType()) {
                            case "MultipleChoiceQuestion": {
                                List<MultipleChoiseOption> options = ((MultipleChoiceQuestion) q).getOptions();
                                for (MultipleChoiseOption o : options) {
                                    o.setId(null);
                                }
                            }
                            break;

                        }
                    }
                }

                Logger.debug(ex.toString());
                ex.save();

                return ok();
            }

            default:

        }

        return badRequest("Jokin meni pieleen");
    }

    //  @Authenticate
    public static Result getExamSections(Long examid) {
        List<ExamSection> sections = Ebean.find(ExamSection.class).where()
                .eq("id", examid)
                .findList();

        return ok(Json.toJson(sections));
    }

    //  @Authenticate
    public static Result deleteSection(Long sectionId) {
        Exam exam = Ebean.find(Exam.class)
                .where()
                .eq("examSections.id", sectionId)
                .findUnique();

        ExamSection section = Ebean.find(ExamSection.class, sectionId);
        exam.getExamSections().remove(section);
        exam.save();
        section.delete();

        return ok("removed");
    }

    //    @Authenticate
//    @Restrict(@Group({"TEACHER"}))
    public static Result addSection() {

        DynamicForm df = Form.form().bindFromRequest();

        Logger.debug("course Code: " + df.get("courseCode"));
        Logger.debug("course Name: " + df.get("courseName"));
        Logger.debug("course Scope: " + df.get("courseScope"));
        Logger.debug("Faculty Name: " + df.get("facultyName"));
        Logger.debug("Exam Instructor Name: " + df.get("instructorName"));

        User user = UserController.getLoggedUser();

        return ok("section created");
    }

    public static Result getEnrolments() {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class).findList();


//        return ok(Json.toJson(enrolments));


        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    public static Result getEnrolmentsForUser(Long uid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .where()
                .eq("user.id", uid)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course");
            options.setPathProperties("exam.course", "code");
            options.setPathProperties("reservation", "startAt, machine");
            options.setPathProperties("reservation.machine", "name");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    public static Result getEnrolmentsForExam(Long eid) {
        List<ExamEnrolment> enrolments = Ebean.find(ExamEnrolment.class)
                .fetch("exam")
                .fetch("reservation")
                .where()
                .eq("exam.id", eid)
                .findList();

        if (enrolments == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, enrolledOn, user, exam, reservation");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course");
            options.setPathProperties("exam.course", "code");
            options.setPathProperties("reservation", "startAt, machine");
            options.setPathProperties("reservation.machine", "name");

            return ok(jsonContext.toJsonString(enrolments, true, options)).as("application/json");
        }
    }

    public static Result getParticipationsForExam(Long eid) {
        List<ExamParticipation> participations = Ebean.find(ExamParticipation.class)
                .fetch("exam")
                .where()
                .eq("exam.id", eid)
                .findList();

        if (participations == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, user, exam, started, ended");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id, name, course");
            options.setPathProperties("exam.course", "code");

            return ok(jsonContext.toJsonString(participations, true, options)).as("application/json");
        }
    }

    public static Result getExamInspections(Long id) {

        List<ExamInspection> inspections = Ebean.find(ExamInspection.class).where().eq("exam.id", id).findList();

        Map<String, String> results = new HashMap<>();

        if(inspections != null) {
            for(ExamInspection i : inspections) {
                results.put("" + i.getId(), i.getUser().getFirstName() + " " + i.getUser().getLastName());
            }
        }
        return ok(Json.toJson(results));
    }

    public static Result getInspections() {
        List<ExamInspection> inspections = Ebean.find(ExamInspection.class)
                .fetch("exam", "name", new FetchConfig().query())
                .findList();

        // select only exam.name  works
        // but Json reflection will invoke lazy loading
        // https://groups.google.com/forum/#!topic/play-framework/xVDmm4hQqfY

        if (inspections == null) {
            return notFound();
        } else {
            JsonContext jsonContext = Ebean.createJsonContext();
            JsonWriteOptions options = new JsonWriteOptions();
            options.setRootPathProperties("id, user, exam");
            options.setPathProperties("user", "id");
            options.setPathProperties("exam", "id");

            return ok(jsonContext.toJsonString(inspections, true, options)).as("application/json");
        }
    }

    public static Result insertInspection(Long eid, Long uid) throws SitnetException {
        Logger.debug("insertInspection()");

        ExamInspection inspection = bindForm(ExamInspection.class);
        User recipient = Ebean.find(User.class, uid);
        Exam exam = Ebean.find(Exam.class, eid);

        inspection.setExam(exam);
        inspection.setUser(recipient);

        inspection.setComment((Comment) SitnetUtil.setCreator(inspection.getComment()));
        inspection.getComment().save();
        inspection.save();

        // SITNET-295
        EmailComposer.composeSimpleInspectionReadyNotification(recipient, exam.getCreator(), exam, inspection.getComment().getComment());

        return ok(Json.toJson(inspection));
    }

    public static Result deleteInspection(Long id) {
        Logger.debug("removeInspection()");

        Ebean.delete(ExamInspection.class, id);

        return ok();
    }
}
