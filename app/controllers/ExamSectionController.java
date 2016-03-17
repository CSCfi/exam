package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.PathProperties;
import models.Exam;
import models.ExamSection;
import models.ExamSectionQuestion;
import models.User;
import models.api.Sortable;
import models.questions.Question;
import play.data.DynamicForm;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.*;


public class ExamSectionController extends BaseController {

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertSection(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            ExamSection section = new ExamSection();
            section.setLotteryItemCount(1);
            section.setExam(exam);
            section.setSectionQuestions(Collections.emptySet());
            section.setSequenceNumber(exam.getExamSections().size());
            section.setExpanded(true);
            AppUtil.setCreator(section, user);
            section.save();
            return ok(section, PathProperties.parse("(*, sectionQuestions(*))"));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeSection(Long eid, Long sid) {
        ExamSection section = Ebean.find(ExamSection.class)
                .fetch("exam.examOwners")
                .where()
                .eq("exam.id", eid)
                .idEq(sid)
                .findUnique();
        if (section == null) {
            return notFound("sitnet_error_not_found");
        }
        Exam exam = section.getExam();

        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            exam.getExamSections().remove(section);
            exam.update();
            // clear parent id from children
            for (ExamSectionQuestion examSectionQuestion : section.getSectionQuestions()) {
                for (Question question : examSectionQuestion.getQuestion().getChildren()) {
                    question.setParent(null);
                    question.update();
                }
            }
            // Decrease sequences for the entries above the inserted one
            int seq = section.getSequenceNumber();
            for (ExamSection es : exam.getExamSections()) {
                int num = es.getSequenceNumber();
                if (num >= seq) {
                    es.setSequenceNumber(num - 1);
                    es.update();
                }
            }
            return ok();
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result updateSection(Long eid, Long sid) {
        ExamSection section = Ebean.find(ExamSection.class)
                .fetch("exam.examOwners")
                .where()
                .eq("exam.id", eid)
                .idEq(sid)
                .findUnique();
        if (section == null) {
            return notFound("sitnet_error_not_found");
        }
        User user = getLoggedUser();
        if (!section.getExam().isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("sitnet_error_access_forbidden");
        }

        ExamSection form = formFactory.form(ExamSection.class).bindFromRequest(
                "id",
                "name",
                "expanded",
                "lotteryOn",
                "lotteryItemCount",
                "description"
        ).get();

        section.setName(form.getName());
        section.setExpanded(form.getExpanded());
        section.setLotteryOn(form.getLotteryOn());
        section.setLotteryItemCount(Math.max(1, form.getLotteryItemCount()));
        section.setDescription(form.getDescription());

        section.update();

        return ok(Json.toJson(section));
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reorderSections(Long eid) {
        DynamicForm df = formFactory.form().bindFromRequest();
        Integer from = Integer.parseInt(df.get("from"));
        Integer to = Integer.parseInt(df.get("to"));
        Result result = checkBounds(from, to);
        if (result != null) {
            return result;
        }
        Exam exam = Ebean.find(Exam.class).fetch("examSections").where().idEq(eid).findUnique();
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            // Reorder by sequenceNumber (TreeSet orders the collection based on it)
            List<ExamSection> sections = new ArrayList<>(new TreeSet<>(exam.getExamSections()));
            ExamSection prev = sections.get(from);
            boolean removed = sections.remove(prev);
            if (removed) {
                sections.add(to, prev);
                for (int i = 0; i < sections.size(); ++i) {
                    ExamSection section = sections.get(i);
                    section.setSequenceNumber(i);
                    section.update();
                }
            }
            return ok();
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    private Question clone(Question blueprint) {
        User user = getLoggedUser();
        Question question = blueprint.copy();
        AppUtil.setCreator(question, user);
        AppUtil.setModifier(question, user);
        question.save();
        Ebean.saveAll(question.getOptions());
        return question;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reorderSectionQuestions(Long eid, Long sid) {
        DynamicForm df = formFactory.form().bindFromRequest();
        Integer from = Integer.parseInt(df.get("from"));
        Integer to = Integer.parseInt(df.get("to"));
        Result result = checkBounds(from, to);
        if (result != null) {
            return result;
        }
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound("sitnet_error_exam_not_found");
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            ExamSection section = Ebean.find(ExamSection.class, sid);
            if (section == null) {
                return notFound("section not found");
            }
            // Reorder by sequenceNumber (TreeSet orders the collection based on it)
            List<ExamSectionQuestion> questions = new ArrayList<>(new TreeSet<>(section.getSectionQuestions()));
            ExamSectionQuestion prev = questions.get(from);
            boolean removed = questions.remove(prev);
            if (removed) {
                questions.add(to, prev);
                for (int i = 0; i < questions.size(); ++i) {
                    ExamSectionQuestion question = questions.get(i);
                    question.setSequenceNumber(i);
                    question.update();
                }
            }
            return ok();
        }
        return forbidden("sitnet_error_access_forbidden");
    }

    private void updateSequences(Collection<? extends Sortable> sortables, int ordinal) {
        // Increase sequences for the entries above the inserted one
        for (Sortable s : sortables) {
            int sequenceNumber = s.getOrdinal();
            if (sequenceNumber >= ordinal) {
                s.setOrdinal(sequenceNumber + 1);
            }
        }
    }

    private Result insertQuestion(Exam exam, ExamSection section, Question question, User user, Integer seq) {
        String validationResult = question.getValidationResult();
        if (validationResult != null) {
            return forbidden(validationResult);
        }
        if (question.getType().equals(Question.Type.EssayQuestion)) {
            // disable auto evaluation for this exam
            if (exam.getAutoEvaluationConfig() != null) {
                exam.getAutoEvaluationConfig().delete();
            }
        }
        Question clone = clone(question);

        // Assert that the sequence number provided is within limits
        seq = Math.min(Math.max(0, seq), section.getSectionQuestions().size());
        updateSequences(section.getSectionQuestions(), seq);
        Ebean.updateAll(section.getSectionQuestions());

        // Insert new section question
        ExamSectionQuestion sectionQuestion = new ExamSectionQuestion();
        sectionQuestion.setExamSection(section);
        sectionQuestion.setQuestion(clone);
        sectionQuestion.setSequenceNumber(seq);
        section.getSectionQuestions().add(sectionQuestion);
        AppUtil.setModifier(section, user);
        section.save();
        section.setSectionQuestions(new TreeSet<>(section.getSectionQuestions()));
        return null;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertQuestion(Long eid, Long sid, Integer seq, Long qid) {
        Exam exam = Ebean.find(Exam.class, eid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        Question question = Ebean.find(Question.class, qid);
        if (exam == null || section == null || question == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!exam.isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("sitnet_error_access_forbidden");
        }
        Result result = insertQuestion(exam, section, question, user, seq);
        return result == null ? ok(Json.toJson(section)) : result;

    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertMultipleQuestions(Long eid, Long sid, Integer seq, String questions) {

        Exam exam = Ebean.find(Exam.class, eid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        if (exam == null || section == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (!exam.isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("sitnet_error_access_forbidden");
        }
        for (String s : questions.split(",")) {
            Question question = Ebean.find(Question.class, Long.parseLong(s));
            if (question == null) {
                continue;
            }
            Result result = insertQuestion(exam, section, question, user, seq);
            if (result != null) {
                return result;
            }
        }
        return ok(Json.toJson(section));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeQuestion(Long eid, Long sid, Long qid) {
        User user = getLoggedUser();
        Question question = Ebean.find(Question.class)
                .fetch("examSectionQuestion.examSection.exam.examOwners")
                .where()
                .idEq(qid)
                .eq("examSectionQuestion.examSection.id", sid)
                .eq("examSectionQuestion.examSection.exam.id", eid)
                .findUnique();
        if (question == null) {
            return notFound("sitnet_error_not_found");
        }
        ExamSectionQuestion sectionQuestion = question.getExamSectionQuestion();
        ExamSection section = sectionQuestion.getExamSection();
        Exam exam = section.getExam();
        if (!exam.isOwnedOrCreatedBy(user) && !user.hasRole("ADMIN", getSession())) {
            return forbidden("sitnet_error_access_forbidden");
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
        section.update();
        return ok(Json.toJson(section));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result clearQuestions(Long eid, Long sid) {
        ExamSection section = Ebean.find(ExamSection.class)
                .fetch("exam.creator")
                .fetch("exam.examOwners")
                .fetch("exam.parent.examOwners")
                .where()
                .idEq(sid)
                .eq("exam.id", eid)
                .findUnique();
        if (section == null) {
            return notFound("sitnet_error_not_found");
        }
        User user = getLoggedUser();
        if (section.getExam().isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            section.getSectionQuestions().forEach(sq -> {
                sq.getQuestion().getChildren().forEach(c -> {
                    c.setParent(null);
                    c.update();
                });
                sq.delete();
            });
            section.getSectionQuestions().clear();
            section.update();
            return ok(Json.toJson(section));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private Result checkBounds(Integer from, Integer to) {
        if (from < 0 || to < 0) {
            return badRequest();
        }
        if (from.equals(to)) {
            return ok();
        }
        return null;
    }

}
