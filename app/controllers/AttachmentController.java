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

package controllers;

import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import controllers.base.BaseController;
import io.ebean.DB;
import io.ebean.ExpressionList;
import java.io.File;
import java.io.IOException;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.Attachment;
import models.Comment;
import models.Exam;
import models.LanguageInspection;
import models.Role;
import models.User;
import models.api.AttachmentContainer;
import models.questions.EssayAnswer;
import models.questions.Question;
import models.sections.ExamSectionQuestion;
import org.apache.pekko.stream.IOResult;
import org.apache.pekko.stream.javadsl.FileIO;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import play.libs.Files;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;
import sanitizers.Attrs;
import security.Authenticated;
import util.config.ConfigReader;
import util.file.FileHandler;

public class AttachmentController extends BaseController implements LocalAttachmentInterface {

    @Inject
    private ConfigReader configReader;

    @Inject
    private FileHandler fileHandler;

    @Authenticated
    @Restrict({ @Group("STUDENT") })
    @Override
    public CompletionStage<Result> addAttachmentToQuestionAnswer(Http.Request request) {
        MultipartForm mf = getForm(request);
        FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        long qid = Long.parseLong(mf.getForm().get("questionId")[0]);

        // first check if answer already exists
        ExamSectionQuestion question = DB
            .find(ExamSectionQuestion.class)
            .fetch("essayAnswer")
            .where()
            .idEq(qid)
            .eq("examSection.exam.creator", request.attrs().get(Attrs.AUTHENTICATED_USER))
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
            newFilePath =
                copyFile(
                    filePart.getRef(),
                    "question",
                    Long.toString(qid),
                    "answer",
                    question.getEssayAnswer().getId().toString()
                );
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("i18n_error_creating_attachment"));
        }
        // Remove existing one if found
        EssayAnswer answer = question.getEssayAnswer();
        fileHandler.removePrevious(question.getEssayAnswer());

        Attachment attachment = fileHandler.createNew(filePart, newFilePath);
        answer.setAttachment(attachment);
        answer.save();
        return wrapAsPromise(ok(answer));
    }

    private CompletionStage<Result> replaceAndFinish(
        AttachmentContainer ac,
        FilePart<Files.TemporaryFile> fp,
        String path
    ) {
        // Remove existing one if found
        fileHandler.removePrevious(ac);

        Attachment attachment = fileHandler.createNew(fp, path);

        ac.setAttachment(attachment);
        ac.save();

        return wrapAsPromise(ok(attachment));
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public CompletionStage<Result> addAttachmentToQuestion(Http.Request request) {
        MultipartForm mf = getForm(request);
        long qid = Long.parseLong(mf.getForm().get("questionId")[0]);
        Question question = DB
            .find(Question.class)
            .fetch("examSectionQuestions.examSection.exam.parent")
            .where()
            .idEq(qid)
            .findOne();
        if (question == null) {
            return wrapAsPromise(notFound());
        }
        FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        String newFilePath;
        try {
            newFilePath = copyFile(filePart.getRef(), "question", Long.toString(qid));
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("i18n_error_creating_attachment"));
        }
        return replaceAndFinish(question, filePart, newFilePath);
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public Result deleteQuestionAttachment(Long id) {
        Question question = DB.find(Question.class, id);
        if (question == null) {
            return notFound();
        }
        fileHandler.removePrevious(question);
        return ok();
    }

    @Authenticated
    @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExamSectionQuestion question;
        if (user.hasRole(Role.Name.STUDENT)) {
            question =
                DB.find(ExamSectionQuestion.class).where().idEq(qid).eq("examSection.exam.creator", user).findOne();
        } else {
            question = DB.find(ExamSectionQuestion.class, qid);
        }
        if (
            question != null && question.getEssayAnswer() != null && question.getEssayAnswer().getAttachment() != null
        ) {
            EssayAnswer answer = question.getEssayAnswer();
            Attachment aa = answer.getAttachment();
            answer.setAttachment(null);
            answer.save();
            fileHandler.removeAttachmentFile(aa.getFilePath());
            aa.delete();
            return wrapAsPromise(ok(answer));
        }
        return wrapAsPromise(notFound());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public CompletionStage<Result> deleteExamAttachment(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class, id);
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
        }

        fileHandler.removePrevious(exam);
        return wrapAsPromise(ok());
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public CompletionStage<Result> deleteFeedbackAttachment(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class, id);
        if (exam == null) {
            return wrapAsPromise(notFound("i18n_exam_not_found"));
        }
        Comment comment = exam.getExamFeedback();
        fileHandler.removePrevious(comment);
        return wrapAsPromise(ok());
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    @Override
    public CompletionStage<Result> deleteStatementAttachment(Long id, Http.Request request) {
        LanguageInspection inspection = DB.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
        if (inspection == null || inspection.getStatement() == null) {
            return wrapAsPromise(notFound("i18n_exam_not_found"));
        }
        Comment comment = inspection.getStatement();
        fileHandler.removePrevious(comment);
        return wrapAsPromise(ok());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public CompletionStage<Result> addAttachmentToExam(Http.Request request) {
        MultipartForm mf = getForm(request);
        long eid = Long.parseLong(mf.getForm().get("examId")[0]);
        Exam exam = DB.find(Exam.class, eid);
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
            return wrapAsPromise(forbidden("i18n_error_access_forbidden"));
        }
        String newFilePath;
        FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
        try {
            newFilePath = copyFile(filePart.getRef(), "exam", Long.toString(eid));
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("i18n_error_creating_attachment"));
        }
        return replaceAndFinish(exam, filePart, newFilePath);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
    @Override
    public CompletionStage<Result> addFeedbackAttachment(Long id, Http.Request request) {
        Exam exam = DB.find(Exam.class, id);
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        if (exam.getExamFeedback() == null) {
            Comment comment = new Comment();
            comment.setCreatorWithDate(request.attrs().get(Attrs.AUTHENTICATED_USER));
            comment.save();
            exam.setExamFeedback(comment);
            exam.update();
        }
        String newFilePath;
        FilePart<Files.TemporaryFile> filePart = getForm(request).getFilePart();
        try {
            newFilePath = copyFile(filePart.getRef(), "exam", id.toString(), "feedback");
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("i18n_error_creating_attachment"));
        }
        Comment comment = exam.getExamFeedback();
        return replaceAndFinish(comment, filePart, newFilePath);
    }

    @Authenticated
    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    @Override
    public CompletionStage<Result> addStatementAttachment(Long id, Http.Request request) {
        LanguageInspection inspection = DB.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
        if (inspection == null) {
            return wrapAsPromise(notFound());
        }
        if (inspection.getStatement() == null) {
            Comment comment = new Comment();
            comment.setCreatorWithDate(request.attrs().get(Attrs.AUTHENTICATED_USER));
            comment.save();
            inspection.setStatement(comment);
            inspection.update();
        }
        FilePart<Files.TemporaryFile> filePart = getForm(request).getFilePart();
        String newFilePath;
        try {
            newFilePath = copyFile(filePart.getRef(), "exam", id.toString(), "inspectionstatement");
        } catch (IOException e) {
            return wrapAsPromise(internalServerError("i18n_error_creating_attachment"));
        }
        Comment comment = inspection.getStatement();
        return replaceAndFinish(comment, filePart, newFilePath);
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> downloadQuestionAttachment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Question question;
        if (user.hasRole(Role.Name.STUDENT)) {
            question =
                DB
                    .find(Question.class)
                    .where()
                    .idEq(id)
                    .eq("examSectionQuestions.examSection.exam.creator", user)
                    .findOne();
        } else {
            question = DB.find(Question.class, id);
        }
        if (question == null || question.getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(question.getAttachment());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, Http.Request request) {
        // TODO: Authorization?
        ExamSectionQuestion question = getExamSectionQuestion(request, qid);
        if (
            question == null || question.getEssayAnswer() == null || question.getEssayAnswer().getAttachment() == null
        ) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(question.getEssayAnswer().getAttachment());
    }

    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> downloadExamAttachment(Long id, Http.Request request) {
        // TODO: Authorization?
        Exam exam = DB.find(Exam.class, id);
        if (exam == null || exam.getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getAttachment());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> downloadFeedbackAttachment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        Exam exam;
        if (user.hasRole(Role.Name.STUDENT)) {
            exam = DB.find(Exam.class).where().idEq(id).eq("creator", user).findOne();
        } else {
            exam = DB.find(Exam.class, id);
        }
        if (exam == null || exam.getExamFeedback() == null || exam.getExamFeedback().getAttachment() == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getExamFeedback().getAttachment());
    }

    @Authenticated
    @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
    @Override
    public CompletionStage<Result> downloadStatementAttachment(Long id, Http.Request request) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        ExpressionList<Exam> query = DB
            .find(Exam.class)
            .where()
            .idEq(id)
            .isNotNull("languageInspection.statement.attachment");
        if (user.hasRole(Role.Name.STUDENT)) {
            query = query.eq("creator", user);
        }
        Exam exam = query.findOne();
        if (exam == null) {
            return wrapAsPromise(notFound());
        }
        return serveAttachment(exam.getLanguageInspection().getStatement().getAttachment());
    }

    @Override
    public ConfigReader getConfigReader() {
        return configReader;
    }

    private CompletionStage<Result> serveAttachment(Attachment attachment) {
        File file = new File(attachment.getFilePath());
        if (!file.exists()) {
            return wrapAsPromise(internalServerError("i18n_file_not_found_but_referred_in_database"));
        }
        final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.toPath());
        return serveAsBase64Stream(attachment, source);
    }

    private ExamSectionQuestion getExamSectionQuestion(Http.Request request, Long id) {
        User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
        if (user.hasRole(Role.Name.STUDENT)) {
            return DB.find(ExamSectionQuestion.class).where().idEq(id).eq("examSection.exam.creator", user).findOne();
        }
        return DB.find(ExamSectionQuestion.class, id);
    }

    private String copyFile(Files.TemporaryFile srcFile, String... pathParams) throws IOException {
        String newFilePath = fileHandler.createFilePath(pathParams);
        fileHandler.copyFile(srcFile, new File(newFilePath));
        return newFilePath;
    }
}
