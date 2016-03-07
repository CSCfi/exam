package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import models.Exam;
import models.ExamSection;
import models.ExamSectionQuestion;
import models.User;
import models.questions.Question;
import play.data.Form;
import play.libs.Json;
import play.mvc.Result;
import util.AppUtil;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;


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
            AppUtil.setCreator(section, user);
            section.save();
            return ok(Json.toJson(section));
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

    private Question clone(Question blueprint) {
        User user = getLoggedUser();
        Question question = blueprint.copy();
        AppUtil.setCreator(question, user);
        AppUtil.setModifier(question, user);
        question.save();
        Ebean.save(question.getOptions());
        return question;
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result reorderSectionQuestions(Long eid, Long sid, Integer from, Integer to) {
        if (from < 0 || to < 0) {
            return badRequest();
        }
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            ExamSection section = Ebean.find(ExamSection.class, sid);
            if (from.equals(to)) {
                return ok();
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

    private void updateSequences(ExamSection section, int ordinal) {
        // Increase sequences for the entries above the inserted one
        for (ExamSectionQuestion esq : section.getSectionQuestions()) {
            int sequenceNumber = esq.getSequenceNumber();
            if (sequenceNumber >= ordinal) {
                esq.setSequenceNumber(sequenceNumber + 1);
                esq.update();
            }
        }
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result insertQuestion(Long eid, Long sid, Integer seq, Long qid) {
        Exam exam = Ebean.find(Exam.class, eid);
        ExamSection section = Ebean.find(ExamSection.class, sid);
        if (section == null) {
            return notFound();
        }
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            Question question = Ebean.find(Question.class, qid);
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
            updateSequences(section, seq);

            // Insert new section question
            ExamSectionQuestion sectionQuestion = new ExamSectionQuestion();
            sectionQuestion.setExamSection(section);
            sectionQuestion.setQuestion(clone);
            sectionQuestion.setSequenceNumber(seq);
            section.getSectionQuestions().add(sectionQuestion);
            AppUtil.setModifier(section, user);
            section.save();
            section.setSectionQuestions(new TreeSet<>(section.getSectionQuestions()));
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
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            for (String s : questions.split(",")) {
                Question question = Ebean.find(Question.class, Long.parseLong(s));
                Question clone = clone(question);
                if (clone == null) {
                    return notFound("Question type not specified");
                }

                // Assert that the sequence number provided is within limits
                seq = Math.min(Math.max(0, seq), section.getSectionQuestions().size());
                updateSequences(section, seq);

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
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
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
        ExamSection section = Ebean.find(ExamSection.class)
                .fetch("exam.creator")
                .fetch("exam.examOwners")
                .fetch("exam.parent.examOwners")
                .where()
                .idEq(sid)
                .findUnique();
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

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result removeSection(Long eid, Long sid) {
        Exam exam = Ebean.find(Exam.class, eid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
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
        sectionToUpdate.setLotteryItemCount(Math.max(1, section.getLotteryItemCount()));
        sectionToUpdate.update();

        return ok(Json.toJson(sectionToUpdate));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result getExamSections(Long examid) {
        Exam exam = Ebean.find(Exam.class, examid);
        User user = getLoggedUser();
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
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
        if (exam.isOwnedOrCreatedBy(user) || user.hasRole("ADMIN", getSession())) {
            ExamSection section = Ebean.find(ExamSection.class, sectionId);
            exam.getExamSections().remove(section);
            exam.save();
            section.delete();
            return ok("removed");
        } else {
            return forbidden("sitnet_error_access_forbidden");
        }
    }

}
