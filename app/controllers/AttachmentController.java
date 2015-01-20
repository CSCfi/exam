package controllers;


import Exceptions.MalformedDataException;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Attachment;
import models.Exam;
import models.answers.AbstractAnswer;
import models.answers.EssayAnswer;
import models.answers.MultipleChoiseAnswer;
import models.questions.AbstractQuestion;
import play.Logger;
import play.Play;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;
import util.SitnetUtil;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import static util.java.AttachmentUtils.setData;


/**
 * Created by alahtinen on 3.6.2014.
 */
public class AttachmentController extends SitnetController {

    @Restrict({@Group("STUDENT")})
    public static Result addAttachmentToQuestionAnswer() throws MalformedDataException {

        MultipartFormData body = request().body().asMultipartFormData();

        FilePart filePart = body.getFile("file");

        Map<String, String[]> m = body.asFormUrlEncoded();

        String[] q = m.get("questionId");

        String idstr = q[0];
        Long qid = Long.parseLong(idstr);

        if (filePart != null) {
            String fileName = filePart.getFilename();
            String contentType = filePart.getContentType();
            File file = filePart.getFile();

            String uploadPath = Play.application().configuration().getString("sitnet.question.answer.attachments.path");
            String playPath = Play.application().path().getAbsolutePath();

            // first check if answer already exist
            AbstractQuestion question = Ebean.find(AbstractQuestion.class)
                    .fetch("answer")
                    .where()
                    .eq("id", qid)
                    .findUnique();

            if (question.getAnswer() == null) {

                switch (question.getType()) {
                    case "EssayQuestion": {
                        EssayAnswer essayQuestion = new EssayAnswer();
                        question.setAnswer(essayQuestion);
                        question.save();
                    }
                    break;

                    case "MultipleChoiceQuestion": {
                        MultipleChoiseAnswer multipleChoiseAnswer = new MultipleChoiseAnswer();
                        question.setAnswer(multipleChoiseAnswer);
                        question.save();
                    }
                    break;
                    default:
                        return notFound("Unsupported question type");
                }
            }


            // TODO Use smarter config
            String basePath = playPath + "/" + uploadPath + "/" + String.valueOf(qid) + "/answer/" + String.valueOf(question.getAnswer().getId());
            File dir = new File(basePath);
            if (dir.mkdirs()) {
                Logger.info("Created attachment directory");
            }
            String rndFileName = UUID.randomUUID().toString();
            String newFile = basePath + "/" + rndFileName;
            Attachment attachment = null;

            try {
                if (SitnetUtil.copyFile(file, new File(newFile))) {

                    attachment = question.getAnswer().getAttachment();

                    // If the question didn't have an attachment before, it does now.
                    if (attachment == null) {
                        attachment = new Attachment();
                    }

                    attachment.setFileName(fileName);
                    attachment.setFilePath(newFile);
                    attachment.setMimeType(contentType);

                    attachment.save();

                    question.getAnswer().setAttachment(attachment);
                    question.save();

                }
            } catch (IOException e) {
                e.printStackTrace();
                // TODO: send mail to admin? Could indicate an OOM.
            }

            if (attachment == null) {
                return notFound("sitnet_error_creating_attachment");
            } else {
                JsonContext jsonContext = Ebean.createJsonContext();
                JsonWriteOptions options = new JsonWriteOptions();
                options.setRootPathProperties("id, fileName");

                return ok(jsonContext.toJsonString(attachment, true, options)).as("application/json");
            }
        }
        return notFound();
    }


    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addAttachmentToQuestion() throws MalformedDataException {

        MultipartFormData body = request().body().asMultipartFormData();

        FilePart filePart = body.getFile("file");

        Map<String, String[]> m = body.asFormUrlEncoded();

        String[] d = m.get("questionId");
        String idstr = d[0];
        Long id = Long.parseLong(idstr);

        if (filePart != null) {
            String fileName = filePart.getFilename();
            String contentType = filePart.getContentType();
            File file = filePart.getFile();

            String uploadPath = Play.application().configuration().getString("sitnet.question.attachments.path");
            String playPath = Play.application().path().getAbsolutePath();

            // TODO Use smarter config
            String basePath = playPath + "/" + uploadPath + "/" + String.valueOf(id);
            File dir = new File(basePath);
            if (dir.mkdirs()) {
                Logger.info("Created attachment directory");
            }
            String rndFileName = UUID.randomUUID().toString();
            String newFile = basePath + "/" + rndFileName;
            Attachment attachment = null;

            try {
                if (SitnetUtil.copyFile(file, new File(newFile))) {

                    AbstractQuestion question = Ebean.find(AbstractQuestion.class)
                            .fetch("attachment")
                            .where()
                            .eq("id", id)
                            .findUnique();

                    if (question != null) {

                        attachment = question.getAttachment();

                        // If the question didn't have an attachment before, it does now.
                        if (attachment == null) {
                            attachment = new Attachment();
                        }

                        attachment.setFileName(fileName);
                        attachment.setFilePath(newFile);
                        attachment.setMimeType(contentType);

                        attachment.save();

                        question.setAttachment(attachment);
                        question.save();
                        Ebean.save(question);
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }

            if (attachment == null) {
                return notFound("sitnet_error_creating_attachment");
            } else {
                JsonContext jsonContext = Ebean.createJsonContext();
                JsonWriteOptions options = new JsonWriteOptions();
                options.setRootPathProperties("id, fileName");

                return ok(jsonContext.toJsonString(attachment, true, options)).as("application/json");
            }
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteQuestionAttachment(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);
        Attachment aa = Ebean.find(Attachment.class, question.getAttachment().getId());

        question.setAttachment(null);
        question.save();

        aa.delete();

        return redirect("/#/questions/" + String.valueOf(id));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result deleteQuestionAnswerAttachment(Long qid, String hash) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class, qid);
        Attachment aa = Ebean.find(Attachment.class, question.getAnswer().getAttachment().getId());

        AbstractAnswer answer = question.getAnswer();
        answer.setAttachment(null);
        answer.save();
        aa.delete();

        return redirect("/#/student/doexam/" + hash);
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result deleteExamAttachment(Long id) {

        Exam exam = Ebean.find(Exam.class, id);
        Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());
        if (aa != null) {
            exam.setAttachment(null);
            exam.save();
            aa.delete();
        }
        return redirect("/#/exams/" + String.valueOf(id));

    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    public static Result addAttachmentToExam() throws MalformedDataException {

        MultipartFormData body = request().body().asMultipartFormData();

        FilePart filePart = body.getFile("file");

        Map<String, String[]> m = body.asFormUrlEncoded();

        String[] d = m.get("examId");
        String idstr = d[0];
        Long id = Long.parseLong(idstr);

        if (filePart != null) {
            String fileName = filePart.getFilename();
            String contentType = filePart.getContentType();
            File file = filePart.getFile();

            String uploadPath = Play.application().configuration().getString("sitnet.exam.attachments.path");
            String playPath = Play.application().path().getAbsolutePath();

            // TODO Use smarter config
            String basePath = playPath + "/" + uploadPath + "/" + String.valueOf(id);
            File dir = new File(basePath);
            if (dir.mkdirs()) {
                Logger.info("Created attachment directory");
            }
            String rndFileName = UUID.randomUUID().toString();
            String newFile = basePath + "/" + rndFileName;
            Attachment attachment = null;

            try {
                if (SitnetUtil.copyFile(file, new File(newFile))) {

                    Exam exam = Ebean.find(Exam.class)
                            .fetch("attachment")
                            .where()
                            .eq("id", id)
                            .findUnique();

                    if (exam != null) {

                        attachment = exam.getAttachment();

                        // If the question didn't have an attachment before, it does now.
                        if (attachment == null) {
                            attachment = new Attachment();
                        }

                        attachment.setFileName(fileName);
                        attachment.setFilePath(newFile);
                        attachment.setMimeType(contentType);

                        attachment.save();

                        exam.setAttachment(attachment);
                        exam.save();
                        Ebean.save(exam);
                    }
                }
            } catch (IOException e) {
                e.printStackTrace();
            }

            if (attachment == null) {
                return notFound("sitnet_error_creating_attachment");
            } else {
                JsonContext jsonContext = Ebean.createJsonContext();
                JsonWriteOptions options = new JsonWriteOptions();
                options.setRootPathProperties("id, fileName");

                return ok(jsonContext.toJsonString(attachment, true, options)).as("application/json");
            }
        }
        return notFound();
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result downloadQuestionAttachment(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class)
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
    public static Result downloadQuestionAnswerAttachment(Long qid, String hash) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class)
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
    public static Result downloadExamAttachment(Long id) {

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
