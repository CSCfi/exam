package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;

import Exceptions.MalformedDataException;
import com.avaje.ebean.text.json.JsonContext;
import com.avaje.ebean.text.json.JsonWriteOptions;
import models.Attachment;
import models.Exam;
import models.User;
import models.questions.AbstractQuestion;

import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import util.SitnetUtil;
import play.libs.Json;
import play.mvc.Result;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import util.SitnetUtil;
import play.Play;
import play.Application;
import play.Configuration;



/**
 * Created by alahtinen on 3.6.2014.
 */
public class AttachmentController extends SitnetController {


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
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String rndFileName = UUID.randomUUID().toString();
            String newFile = basePath + "/" + rndFileName;
            Attachment attachment = null;

            try {
                if(SitnetUtil.copyFile(file, new File(newFile))) {

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
                return notFound("Error creating attachment");
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
        Long aId = aa.getId();
        question.save();

        aa.delete();

        Ebean.delete(Attachment.class, aId);

        return redirect("/#/questions/" + String.valueOf(id));
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
            if (!dir.exists()) {
                dir.mkdirs();
            }
            String rndFileName = UUID.randomUUID().toString();
            String newFile = basePath + "/" + rndFileName;
            Attachment attachment = null;

            try {
                if(SitnetUtil.copyFile(file, new File(newFile))) {

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
                return notFound("Error creating attachment");
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
    public static Result deleteExamAttachment(Long id) {

        Exam exam = Ebean.find(Exam.class, id);
        Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());

        exam.setAttachment(null);
        Long aId = aa.getId();
        exam.save();

        aa.delete();

        Ebean.delete(Exam.class, aId);

        return redirect("/#/exams/" + String.valueOf(id));

    }

//    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public static Result downloadQuestionAttachment(Long id) {

        AbstractQuestion question = Ebean.find(AbstractQuestion.class)
                .fetch("attachment")
                .where()
                .eq("id", id)
                .findUnique();

        Attachment aa = Ebean.find(Attachment.class, question.getAttachment().getId());
        File af = new File(aa.getFilePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(af);
    }

    public static Result downloadExamAttachment(Long id) {

        Exam exam = Ebean.find(Exam.class)
                .fetch("attachment")
                .where()
                .eq("id", id)
                .findUnique();

        Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());
        File af = new File(aa.getFilePath());
        response().setHeader("Content-Disposition", "attachment; filename=\"" + aa.getFileName() + "\"");
        return ok(af);
    }
}
