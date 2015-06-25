package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import exceptions.MalformedDataException;
import models.Attachment;
import models.Exam;
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

    @Restrict({@Group("STUDENT")})
    public Result addAttachmentToQuestionAnswer() throws MalformedDataException {

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

        String fileName = filePart.getFilename();
        String contentType = filePart.getContentType();

        String uploadPath = Play.application().configuration().getString("sitnet.question.answer.attachments.path");
        String playPath = Play.application().path().getAbsolutePath();

        // first check if answer already exist
        Question question = Ebean.find(Question.class)
                .fetch("answer")
                .where()
                .idEq(qid)
                .findUnique();

        if (question.getAnswer() == null) {
            question.setAnswer(new Answer());
            question.save();
        }
        // TODO Use smarter config
        String basePath = String.format("%s/%s/%d/answer/%d", playPath, uploadPath, qid, question.getAnswer().getId());
        File dir = new File(basePath);
        if (dir.mkdirs()) {
            Logger.info("Created attachment directory");
        }
        String rndFileName = UUID.randomUUID().toString();
        String newFile = basePath + "/" + rndFileName;
        try {
            AppUtil.copyFile(file, new File(newFile));
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        Attachment attachment = new Attachment();
        attachment.setFileName(fileName);
        attachment.setFilePath(newFile);
        attachment.setMimeType(contentType);
        attachment.save();
        question.getAnswer().setAttachment(attachment);
        question.save();
        return ok(attachment);
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addAttachmentToQuestion() throws MalformedDataException {

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
        String uploadPath = Play.application().configuration().getString("sitnet.question.attachments.path");
        String playPath = Play.application().path().getAbsolutePath();

        // TODO Use smarter config
        String basePath = playPath + "/" + uploadPath + "/" + qid;
        File dir = new File(basePath);
        if (dir.mkdirs()) {
            Logger.info("Created attachment directory");
        }
        String rndFileName = UUID.randomUUID().toString();
        String newFile = basePath + "/" + rndFileName;

        try {
            AppUtil.copyFile(file, new File(newFile));
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        Attachment attachment = new Attachment();
        attachment.setFileName(filePart.getFilename());
        attachment.setFilePath(newFile);
        attachment.setMimeType(filePart.getContentType());
        attachment.save();

        question.setAttachment(attachment);
        question.save();

        return ok(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteQuestionAttachment(Long id) {

        Question question = Ebean.find(Question.class, id);
        Attachment aa = Ebean.find(Attachment.class, question.getAttachment().getId());

        question.setAttachment(null);
        question.save();

        aa.delete();
        AppUtil.removeAttachmentFile(aa.getFilePath());

        return redirect("/#/questions/" + String.valueOf(id));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result deleteQuestionAnswerAttachment(Long qid, String hash) {

        Question question = Ebean.find(Question.class, qid);
        Attachment aa = Ebean.find(Attachment.class, question.getAnswer().getAttachment().getId());

        Answer answer = question.getAnswer();
        answer.setAttachment(null);
        answer.save();
        aa.delete();
        AppUtil.removeAttachmentFile(aa.getFilePath());

        return redirect("/#/student/doexam/" + hash);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result deleteExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam.getAttachment() != null) {
            Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());
            if (aa != null) {
                exam.setAttachment(null);
                exam.save();
                aa.delete();
                AppUtil.removeAttachmentFile(aa.getFilePath());
            }
        }
        return redirect("/#/exams/" + String.valueOf(id));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public Result addAttachmentToExam() throws MalformedDataException {
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
        String uploadPath = Play.application().configuration().getString("sitnet.exam.attachments.path");
        String playPath = Play.application().path().getAbsolutePath();

        // TODO Use smarter config
        String basePath = playPath + "/" + uploadPath + "/" + eid;
        File dir = new File(basePath);
        if (dir.mkdirs()) {
            Logger.info("Created attachment directory");
        }
        String rndFileName = UUID.randomUUID().toString();
        String newFile = basePath + "/" + rndFileName;
        try {
            AppUtil.copyFile(file, new File(newFile));
        } catch (IOException e) {
            return internalServerError("sitnet_error_creating_attachment");
        }
        Attachment attachment = new Attachment();
        attachment.setFileName(filePart.getFilename());
        attachment.setFilePath(newFile);
        attachment.setMimeType(filePart.getContentType());
        attachment.save();

        exam.setAttachment(attachment);
        exam.save();

        return ok(attachment);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadQuestionAttachment(Long id) {

        Question question = Ebean.find(Question.class)
                .fetch("attachment")
                .where()
                .eq("id", id)
                .findUnique();

        Attachment aa = Ebean.find(Attachment.class, question.getAttachment().getId());
        File file = new File(aa.getFilePath());

        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadQuestionAnswerAttachment(Long qid, String hash) {

        Question question = Ebean.find(Question.class)
                .fetch("attachment")
                .where()
                .eq("id", qid)
                .findUnique();

        Attachment aa = Ebean.find(Attachment.class, question.getAnswer().getAttachment().getId());
        File file = new File(aa.getFilePath());

        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public Result downloadExamAttachment(Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("attachment")
                .where()
                .eq("id", id)
                .findUnique();

        Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());
        File file = new File(aa.getFilePath());

        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(com.ning.http.util.Base64.encode(setData(file).toByteArray()));
    }
}
