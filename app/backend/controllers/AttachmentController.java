/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.controllers;


import java.io.File;
import java.io.IOException;
import java.util.Map;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;

import akka.stream.IOResult;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import play.Environment;
import play.mvc.Http.MultipartFormData;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;

import backend.controllers.base.BaseController;
import backend.models.Attachment;
import backend.models.Comment;
import backend.models.Exam;
import backend.models.sections.ExamSectionQuestion;
import backend.models.LanguageInspection;
import backend.models.Role;
import backend.models.User;
import backend.models.api.AttachmentContainer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.util.AppUtil;
import backend.util.config.ConfigUtil;


public class AttachmentController extends BaseController implements LocalAttachmentInterface {

    @Inject
    private Environment environment;

    private static void removePrevious(AttachmentContainer container) {
        if (container.getAttachment() != null) {
            Attachment a = container.getAttachment();
            String filePath = a.getFilePath();
            container.setAttachment(null);
            container.save();
            a.delete();
            // Remove the file from disk if no references to it are found
            boolean removeFromDisk = Ebean.find(Attachment.class).where()
                    .eq("filePath", filePath)
                    .findList()
                    .isEmpty();
            if (removeFromDisk) {
                AppUtil.removeAttachmentFile(a.getFilePath());
            }
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

    @Override
    public CompletionStage<Result> addAttachmentToQuestionAnswer() {
        MultipartFormData<File> body = request().body().asMultipartFormData();
        FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        if (filePart.getFile().length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        File file = filePart.getFile();
        Map<String, String[]> m = body.asFormUrlEncoded();
        long qid = Long.parseLong(m.get("questionId")[0]);

        // first check if answer already exist
        ExamSectionQuestion question = Ebean.find(ExamSectionQuestion.class).fetch("essayAnswer")
                .where()
                .idEq(qid)
                .eq("examSection.exam.creator", getLoggedUser())
                .findOne();
        if (question == null) {
            return wrapAsPromise(forbidden());
        }
        if (question.getEssayAnswer() == null) {
            EssayAnswer answer = new EssayAnswer();
            question.setEssayAnswer(answer);
            question.save();
        }

        String newFilePath;
        try {
            newFilePath = copyFile(file, "question", Long.toString(qid), "answer",
                    question.getEssayAnswer().getId().toString());
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
        }
        // Remove existing one if found
        EssayAnswer answer = question.getEssayAnswer();
        removePrevious(question.getEssayAnswer());

        Attachment attachment = createNew(filePart, newFilePath);
        answer.setAttachment(attachment);
        answer.save();
        return wrapAsPromise(ok(answer));
    }

    @Override
    public CompletionStage<Result> addAttachmentToQuestion() {

        MultipartFormData<File> body = request().body().asMultipartFormData();
        FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        File file = filePart.getFile();
        if (file.length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        Map<String, String[]> m = body.asFormUrlEncoded();
        long qid = Long.parseLong(m.get("questionId")[0]);
        Question question = Ebean.find(Question.class)
                .fetch("examSectionQuestions.examSection.exam.parent")
                .where()
                .idEq(qid)
                .findOne();
        if (question == null) {
            return wrapAsPromise(notFound());
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "question", Long.toString(qid));
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
        }
        // Remove existing one if found
        removePrevious(question);

        Attachment attachment = createNew(filePart, newFilePath);

        question.setAttachment(attachment);
        question.save();

        return wrapAsPromise(ok(attachment));
    }

    @Override
    public Result deleteQuestionAttachment(Long id) {

        Question question = Ebean.find(Question.class, id);
        if (question == null) {
            return notFound();
        }
        removePrevious(question);
        return ok();
    }

    @Override
    public CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid) {
        User user = getLoggedUser();
        ExamSectionQuestion question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(ExamSectionQuestion.class).where()
                    .idEq(qid)
                    .eq("examSection.exam.creator", getLoggedUser())
                    .findOne();
        } else {
            question = Ebean.find(ExamSectionQuestion.class, qid);
        }
        if (question != null && question.getEssayAnswer() != null && question.getEssayAnswer().getAttachment() != null) {
            EssayAnswer answer = question.getEssayAnswer();
            Attachment aa = answer.getAttachment();
            answer.setAttachment(null);
            answer.save();
            AppUtil.removeAttachmentFile(aa.getFilePath());
            aa.delete();
            return wrapAsPromise(ok(answer));
        }
        return wrapAsPromise(notFound());
    }

    @Override
    public CompletionStage<Result> deleteExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        User user = getLoggedUser();
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession()) && !exam.isOwnedOrCreatedBy(user)) {
            return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
        }

        removePrevious(exam);
        return wrapAsPromise(ok());
    }

    @Override
    public CompletionStage<Result> deleteFeedbackAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return wrapAsPromise(notFound("sitnet_exam_not_found"));
        }
        Comment comment = exam.getExamFeedback();
        removePrevious(comment);
        return wrapAsPromise(ok());
    }

    @Override
    public CompletionStage<Result> deleteStatementAttachment(Long id) {
        LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
        if (inspection == null || inspection.getStatement() == null) {
            return wrapAsPromise(notFound("sitnet_exam_not_found"));
        }
        Comment comment = inspection.getStatement();
        removePrevious(comment);
        return wrapAsPromise(ok());
    }

    @Override
    public CompletionStage<Result> addAttachmentToExam() {
        MultipartFormData<File> body = request().body().asMultipartFormData();
        FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        File file = filePart.getFile();
        if (file.length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        Map<String, String[]> m = body.asFormUrlEncoded();
        long eid = Long.parseLong(m.get("examId")[0]);
        Exam exam = Ebean.find(Exam.class, eid);
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        User user = getLoggedUser();
        if (!user.hasRole(Role.Name.ADMIN.toString(), getSession()) && !exam.isOwnedOrCreatedBy(user)) {
            return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
        }
        String newFilePath;
        try {
            newFilePath = copyFile(file, "exam", Long.toString(eid));
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
        }
        // Delete existing if exists
        removePrevious(exam);

        Attachment attachment = createNew(filePart, newFilePath);
        exam.setAttachment(attachment);
        exam.save();
        return wrapAsPromise(ok(attachment));
    }

    @Override
    public CompletionStage<Result> addFeedbackAttachment(Long id) {
        MultipartFormData<File> body = request().body().asMultipartFormData();
        FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        File file = filePart.getFile();
        if (file.length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null) {
            return wrapAsPromise(notFound());
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
            return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
        }
        Comment comment = exam.getExamFeedback();
        removePrevious(comment);

        Attachment attachment = createNew(filePart, newFilePath);
        comment.setAttachment(attachment);
        comment.save();
        return wrapAsPromise(ok(attachment));
    }

    @Override
    public CompletionStage<Result> addStatementAttachment(Long id) {
        MultipartFormData<File> body = request().body().asMultipartFormData();
        FilePart<File> filePart = body.getFile("file");
        if (filePart == null) {
            return wrapAsPromise(notFound());
        }
        File file = filePart.getFile();
        if (file.length() > ConfigUtil.getMaxFileSize()) {
            return wrapAsPromise(forbidden("sitnet_file_too_large"));
        }
        LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
        if (inspection == null) {
            return wrapAsPromise(notFound());
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
            return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
        }
        Comment comment = inspection.getStatement();
        removePrevious(comment);

        Attachment attachment = createNew(filePart, newFilePath);
        comment.setAttachment(attachment);
        comment.save();
        return wrapAsPromise(ok(attachment));
    }

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    public CompletionStage<Result> downloadQuestionAttachment(Long id) {
        User user = getLoggedUser();
        Question question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(Question.class).where()
                    .idEq(id)
                    .eq("examSectionQuestions.examSection.exam.creator", getLoggedUser())
                    .findOne();
        } else {
            question = Ebean.find(Question.class, id);
        }
        if (question == null || question.getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(question.getAttachment());
    }

    @Override
    public CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid) {
        User user = getLoggedUser();
        ExamSectionQuestion question;
        if (user.hasRole("STUDENT", getSession())) {
            question = Ebean.find(ExamSectionQuestion.class).where()
                    .idEq(qid)
                    .eq("examSection.exam.creator", getLoggedUser())
                    .findOne();
        } else {
            question = Ebean.find(ExamSectionQuestion.class, qid);
        }
        if (question == null || question.getEssayAnswer() == null || question.getEssayAnswer().getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(question.getEssayAnswer().getAttachment());
    }

    @Override
    public CompletionStage<Result> downloadExamAttachment(Long id) {
        Exam exam = Ebean.find(Exam.class, id);
        if (exam == null || exam.getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getAttachment());
    }

    @Override
    public CompletionStage<Result> downloadFeedbackAttachment(Long id) {
        User user = getLoggedUser();
        Exam exam;
        if (user.hasRole("STUDENT", getSession())) {
            exam = Ebean.find(Exam.class).where().idEq(id).eq("creator", user).findOne();
        } else {
            exam = Ebean.find(Exam.class, id);
        }
        if (exam == null || exam.getExamFeedback() == null || exam.getExamFeedback().getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getExamFeedback().getAttachment());
    }

    @Override
    public CompletionStage<Result> downloadStatementAttachment(Long id) {

        User user = getLoggedUser();
        ExpressionList<Exam> query = Ebean.find(Exam.class).where().idEq(id)
                .isNotNull("languageInspection.statement.attachment");
        if (user.hasRole("STUDENT", getSession())) {
            query = query.eq("creator", user);
        }
        Exam exam = query.findOne();
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getLanguageInspection().getStatement().getAttachment());
    }

    private CompletionStage<Result> serveAttachment(Attachment attachment) {
        File file = new File(attachment.getFilePath());
        if (!file.exists()) {
            return wrapAsPromise(internalServerError("Requested file does not exist on disk even though referenced from database!"));
        }
        final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.toPath());
        return serveAsBase64Stream(attachment, source);
    }

    private String copyFile(File srcFile, String... pathParams) throws IOException {
        String newFilePath = AppUtil.createFilePath(environment, pathParams);
        AppUtil.copyFile(srcFile, new File(newFilePath));
        return newFilePath;
    }

}
