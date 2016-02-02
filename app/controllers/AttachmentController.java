package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.ExpressionList;
import models.*;
import models.api.AttachmentContainer;
import models.questions.Answer;
import models.questions.Question;
import play.Logger;
import play.Play;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;
import util.AppUtil;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import static util.java.AttachmentUtils.setData;

public class AttachmentController extends BaseController {

    private static void removePrevious(AttachmentContainer container, boolean removeFromDisk) {
        if (container.getAttachment() != null) {
            Attachment aa = container.getAttachment();
            container.setAttachment(null);
            container.save();
            if (removeFromDisk) {
                AppUtil.removeAttachmentFile(aa.getFilePath());
            }
            aa.delete();
        }
    }

    private static Attachment createNew(FilePart file, String path) {
        Attachment attachment = new Attachment();
        attachment.setFileName(file.getFilename());
        attachment.setFilePath(path);
        attachment.setMimeType(file.getContentType());
        attachment.save();
        return attachment;
    }

    @Restrict({@Group("STUDENT")})
    public Result addAttachmentToQuestionAnswer() {

        MultipartFormData body = request().body().asMultipartFormData();
        FilePart filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        if (file.length() > AppUtil.getMaxFileSize()) {
            return forbidden("sitnet_file_too_large");
        }
        Map<String, String[]> m = body.asFormUrlEncoded();
        Long qid = Long.parseLong(m.get("questionId")[0]);

        // first check if answer already exist
        Question question = Ebean.find(Question.class).fetch("answer")
                .where()
                .idEq(qid)
                .eq("examSectionQuestion.examSection.exam.creator", getLoggedUser())
                .findUnique();
        if (question == null) {
            return forbidden();
        }
        if (question.getAnswer() == null) {
            Answer answer = new Answer();
            answer.setType(question.getType());
            question.setAnswer(answer);
            question.save();
        }

        String newFilePath;
        try {
            newFilePath = copyFile(file, "question", qid.toString(), "answer", question.getAnswer().getId().toString());
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        // Remove existing one if found
        Answer answer = question.getAnswer();
        removePrevious(question.getAnswer(), true);

        Attachment attachment = createNew(filePart, newFilePath);
        answer.setAttachment(attachment);
        answer.save();
        return ok(answer);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addAttachmentToQuestion() {

        MultipartFormData body = request().body().asMultipartFormData();
        FilePart filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        if (file.length() > AppUtil.getMaxFileSize()) {
            return forbidden("sitnet_file_too_large");
        }
        Map<String, String[]> m = body.asFormUrlEncoded();
        Long qid = Long.parseLong(m.get("questionId")[0]);
        Question question = Ebean.find(Question.class, qid);
        if (question == null) {
            return notFound();
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "question", qid.toString());
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        // Remove existing one if found
        removePrevious(question, true);

        Attachment attachment = createNew(filePart, newFilePath);

        question.setAttachment(attachment);
        question.save();

        return ok(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestionAttachment(Long id) {

        Question question = Ebean.find(Question.class, id);
        removePrevious(question, false);
        return redirect("/#/questions/" + String.valueOf(id));
    }

    @Restrict({@Group("ADMIN"), @Group("STUDENT")})
    public Result deleteQuestionAnswerAttachment(Long qid, String hash) {
        User user = getLoggedUser();
        Question question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(Question.class).where()
                    .idEq(qid)
                    .eq("examSectionQuestion.examSection.exam.creator", getLoggedUser())
                    .findUnique();
        } else {
            question = Ebean.find(Question.class, qid);
        }
        if (question != null && question.getAnswer() != null && question.getAnswer().getAttachment() != null) {
            Answer answer = question.getAnswer();
            Attachment aa = answer.getAttachment();
            answer.setAttachment(null);
            answer.save();
            AppUtil.removeAttachmentFile(aa.getFilePath());
            aa.delete();
            return ok(answer);
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        removePrevious(exam, false);
        return redirect("/#/exams/" + String.valueOf(id));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteFeedbackAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound("sitnet_exam_not_found");
        }
        Comment comment = exam.getExamFeedback();
        removePrevious(comment, true);
        return ok();
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result deleteStatementAttachment(Long id) {
        LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findUnique();
        if (inspection == null || inspection.getStatement() == null) {
            return notFound("sitnet_exam_not_found");
        }
        Comment comment = inspection.getStatement();
        removePrevious(comment, true);
        return ok();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addAttachmentToExam() {
        MultipartFormData body = request().body().asMultipartFormData();
        FilePart filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        if (file.length() > AppUtil.getMaxFileSize()) {
            return forbidden("sitnet_file_too_large");
        }
        Map<String, String[]> m = body.asFormUrlEncoded();
        Long eid = Long.parseLong(m.get("examId")[0]);
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return notFound();
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "exam", eid.toString());
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        // Delete existing if exists
        removePrevious(exam, false);

        Attachment attachment = createNew(filePart, newFilePath);
        exam.setAttachment(attachment);
        exam.save();
        return ok(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addFeedbackAttachment(Long id) {
        MultipartFormData body = request().body().asMultipartFormData();
        FilePart filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        if (file.length() > AppUtil.getMaxFileSize()) {
            return forbidden("sitnet_file_too_large");
        }
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return notFound();
        }
        if (exam.getExamFeedback() == null) {
            Comment comment = new Comment();
            AppUtil.setCreator(comment, getLoggedUser());
            comment.save();
            exam.setExamFeedback(comment);
            exam.update();
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "exam", id.toString(), "feedback");
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        Comment comment = exam.getExamFeedback();
        removePrevious(comment, true);

        Attachment attachment = createNew(filePart, newFilePath);
        comment.setAttachment(attachment);
        comment.save();
        return ok(attachment);
    }

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    public Result addStatementAttachment(Long id) {
        MultipartFormData body = request().body().asMultipartFormData();
        FilePart filePart = body.getFile("file");
        if (filePart == null) {
            return notFound();
        }
        File file = filePart.getFile();
        if (file.length() > AppUtil.getMaxFileSize()) {
            return forbidden("sitnet_file_too_large");
        }
        LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findUnique();
        if (inspection == null) {
            return notFound();
        }
        if (inspection.getStatement() == null) {
            Comment comment = new Comment();
            AppUtil.setCreator(comment, getLoggedUser());
            comment.save();
            inspection.setStatement(comment);
            inspection.update();
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "exam", id.toString(), "inspectionstatement");
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        Comment comment = inspection.getStatement();
        removePrevious(comment, true);

        Attachment attachment = createNew(filePart, newFilePath);
        comment.setAttachment(attachment);
        comment.save();
        return ok(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadQuestionAttachment(Long id) {
        User user = getLoggedUser();
        Question question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(Question.class).where()
                    .idEq(id)
                    .eq("examSectionQuestion.examSection.exam.creator", getLoggedUser())
                    .findUnique();
        } else {
            question = Ebean.find(Question.class, id);
        }
        if (question == null || question.getAttachment() == null) {
            return notFound();
        }

        Attachment aa = question.getAttachment();
        File file = new File(aa.getFilePath());

        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadQuestionAnswerAttachment(Long qid, String hash) {
        User user = getLoggedUser();
        Question question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(Question.class).where()
                    .idEq(qid)
                    .eq("examSectionQuestion.examSection.exam.creator", getLoggedUser())
                    .findUnique();
        } else {
            question = Ebean.find(Question.class, qid);
        }
        if (question == null || question.getAnswer() == null || question.getAnswer().getAttachment() == null) {
            return notFound();
        }
        Attachment aa = question.getAnswer().getAttachment();
        File file = new File(aa.getFilePath());

        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null || exam.getAttachment() == null) {
            return notFound();
        }
        Attachment aa = exam.getAttachment();
        File file = new File(aa.getFilePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadFeedbackAttachment(Long id) {
        User user = getLoggedUser();
        Exam exam;
        if (user.hasRole("STUDENT", getSession())) {
            exam = Ebean.find(Exam.class).where().idEq(id).eq("creator", user).findUnique();
        } else {
            exam = Ebean.find(Exam.class, id);
        }
        if (exam == null || exam.getExamFeedback() == null || exam.getExamFeedback().getAttachment() == null) {
            return notFound();
        }
        Attachment aa = exam.getExamFeedback().getAttachment();
        File file = new File(aa.getFilePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadStatementAttachment(Long id) {
        User user = getLoggedUser();
        ExpressionList<Exam> query = Ebean.find(Exam.class).where().idEq(id)
                .isNotNull("languageInspection.statement.attachment");
        if (user.hasRole("STUDENT", getSession())) {
            query = query.eq("creator", user);
        }
        Exam exam = query.findUnique();
        if (exam == null) {
            return notFound();
        }
        Attachment aa = exam.getLanguageInspection().getStatement().getAttachment();
        File file = new File(aa.getFilePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    private static String copyFile(File srcFile, String... pathParams) throws IOException {
        String uploadPath = Play.application().configuration().getString("sitnet.attachments.path");
        StringBuilder path = new StringBuilder();
        // Following does not work on windows, but we hopefully aren't using it anyway :)
        if (!uploadPath.startsWith(File.separator)) {
            // relative path
            path.append(Play.application().path().getAbsolutePath()).append(File.separator);
        }
        path.append(uploadPath).append(File.separator);
        for (String param : pathParams) {
            path.append(File.separator).append(param);
        }

        File dir = new File(path.toString());
        if (dir.mkdirs()) {
            Logger.info("Created attachment directory");
        }
        String rndFileName = UUID.randomUUID().toString();
        String newFilePath = path.append(File.separator).append(rndFileName).toString();
        AppUtil.copyFile(srcFile, new File(newFilePath));
        return newFilePath;
    }

}
