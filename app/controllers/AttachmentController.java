package controllers;


import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import com.avaje.ebean.Ebean;

import Exceptions.MalformedDataException;
import models.Attachment;
import models.Exam;
import models.questions.AbstractQuestion;

import java.io.File;
import java.util.Map;

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

    public static Result addAttachmentToQuestion() throws MalformedDataException {

        MultipartFormData body = request().body().asMultipartFormData();

        FilePart filePart = body.getFile("attachment");

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
            String newFile = basePath + "/" + fileName;

            if (file.renameTo(new File(newFile))) {

                AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

                if (question != null) {

                    Attachment attachment = question.getAttachment();

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
                    String url = "/#/questions/" + String.valueOf(id);
                    return redirect(url);
                }
            }
        }
        return ok("Ei ok");
    }
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


    public static Result addAttachmentToExam() throws MalformedDataException {


        MultipartFormData body = request().body().asMultipartFormData();

        FilePart filePart = body.getFile("attachment");

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
            String newFile = basePath + "/" + fileName;

            if (file.renameTo(new File(newFile))) {

                AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);

                if (question != null) {

                    Attachment attachment = question.getAttachment();

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
                    String url = "/#/questions/" + String.valueOf(id);
                    return redirect(url);
                }
            }
        }
        return ok("Ei ok");
    }
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


    public static Result downloadQuestionAttachment(Long id) {
        AbstractQuestion question = Ebean.find(AbstractQuestion.class, id);
        Attachment aa = Ebean.find(Attachment.class, question.getAttachment().getId());
        return ok(new File(aa.getFilePath()));
    }

    public static Result downloadExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        Attachment aa = Ebean.find(Attachment.class, exam.getAttachment().getId());
        return ok(new File(aa.getFilePath()));
    }
}
