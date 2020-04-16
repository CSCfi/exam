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

import akka.stream.IOResult;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.controllers.base.BaseController;
import backend.models.Attachment;
import backend.models.Comment;
import backend.models.Exam;
import backend.models.LanguageInspection;
import backend.models.Role;
import backend.models.User;
import backend.models.api.AttachmentContainer;
import backend.models.questions.EssayAnswer;
import backend.models.questions.Question;
import backend.models.sections.ExamSectionQuestion;
import backend.sanitizers.Attrs;
import backend.security.Authenticated;
import backend.util.AppUtil;
import backend.util.config.ConfigReader;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import io.ebean.Ebean;
import io.ebean.ExpressionList;
import java.io.File;
import java.io.IOException;
import java.nio.file.StandardCopyOption;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import play.Environment;
import play.libs.Files;
import play.mvc.Http;
import play.mvc.Http.MultipartFormData.FilePart;
import play.mvc.Result;

public class AttachmentController extends BaseController implements LocalAttachmentInterface {
  @Inject
  private Environment environment;

  @Inject
  private ConfigReader configReader;

  private static void removePrevious(AttachmentContainer container) {
    if (container.getAttachment() != null) {
      Attachment a = container.getAttachment();
      String filePath = a.getFilePath();
      container.setAttachment(null);
      container.save();
      a.delete();
      // Remove the file from disk if no references to it are found
      boolean removeFromDisk = Ebean.find(Attachment.class).where().eq("filePath", filePath).findList().isEmpty();
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

  @Authenticated
  @Restrict({ @Group("STUDENT") })
  @Override
  public CompletionStage<Result> addAttachmentToQuestionAnswer(Http.Request request) {
    MultipartForm mf = getForm(request);
    FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
    long qid = Long.parseLong(mf.getForm().get("questionId")[0]);

    // first check if answer already exist
    ExamSectionQuestion question = Ebean
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

  private CompletionStage<Result> replaceAndFinish(
    AttachmentContainer ac,
    FilePart<Files.TemporaryFile> fp,
    String path
  ) {
    // Remove existing one if found
    removePrevious(ac);

    Attachment attachment = createNew(fp, path);

    ac.setAttachment(attachment);
    ac.save();

    return wrapAsPromise(ok(attachment));
  }

  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public CompletionStage<Result> addAttachmentToQuestion(Http.Request request) {
    MultipartForm mf = getForm(request);
    long qid = Long.parseLong(mf.getForm().get("questionId")[0]);
    Question question = Ebean
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
      return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
    }
    return replaceAndFinish(question, filePart, newFilePath);
  }

  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public Result deleteQuestionAttachment(Long id) {
    Question question = Ebean.find(Question.class, id);
    if (question == null) {
      return notFound();
    }
    removePrevious(question);
    return ok();
  }

  @Authenticated
  @Restrict({ @Group("ADMIN"), @Group("STUDENT") })
  @Override
  public CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, Http.Request request) {
    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    ExamSectionQuestion question;
    if (user.hasRole(Role.Name.STUDENT)) {
      question = Ebean.find(ExamSectionQuestion.class).where().idEq(qid).eq("examSection.exam.creator", user).findOne();
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

  @Authenticated
  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public CompletionStage<Result> deleteExamAttachment(Long id, Http.Request request) {
    Exam exam = Ebean.find(Exam.class, id);
    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    if (exam == null) {
      return wrapAsPromise(notFound());
    }
    if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
      return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
    }

    removePrevious(exam);
    return wrapAsPromise(ok());
  }

  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public CompletionStage<Result> deleteFeedbackAttachment(Long id, Http.Request request) {
    Exam exam = Ebean.find(Exam.class, id);
    if (exam == null) {
      return wrapAsPromise(notFound("sitnet_exam_not_found"));
    }
    Comment comment = exam.getExamFeedback();
    removePrevious(comment);
    return wrapAsPromise(ok());
  }

  @Authenticated
  @Pattern(value = "CAN_INSPECT_LANGUAGE")
  @Override
  public CompletionStage<Result> deleteStatementAttachment(Long id, Http.Request request) {
    LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
    if (inspection == null || inspection.getStatement() == null) {
      return wrapAsPromise(notFound("sitnet_exam_not_found"));
    }
    Comment comment = inspection.getStatement();
    removePrevious(comment);
    return wrapAsPromise(ok());
  }

  @Authenticated
  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public CompletionStage<Result> addAttachmentToExam(Http.Request request) {
    MultipartForm mf = getForm(request);
    long eid = Long.parseLong(mf.getForm().get("examId")[0]);
    Exam exam = Ebean.find(Exam.class, eid);
    if (exam == null) {
      return wrapAsPromise(notFound());
    }
    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    if (!user.hasRole(Role.Name.ADMIN) && !exam.isOwnedOrCreatedBy(user)) {
      return wrapAsPromise(forbidden("sitnet_error_access_forbidden"));
    }
    String newFilePath;
    FilePart<Files.TemporaryFile> filePart = mf.getFilePart();
    try {
      newFilePath = copyFile(filePart.getRef(), "exam", Long.toString(eid));
    } catch (IOException e) {
      return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
    }
    return replaceAndFinish(exam, filePart, newFilePath);
  }

  @Authenticated
  @Restrict({ @Group("TEACHER"), @Group("ADMIN") })
  @Override
  public CompletionStage<Result> addFeedbackAttachment(Long id, Http.Request request) {
    Exam exam = Ebean.find(Exam.class, id);
    if (exam == null) {
      return wrapAsPromise(notFound());
    }
    if (exam.getExamFeedback() == null) {
      Comment comment = new Comment();
      AppUtil.setCreator(comment, request.attrs().get(Attrs.AUTHENTICATED_USER));
      comment.save();
      exam.setExamFeedback(comment);
      exam.update();
    }
    String newFilePath;
    FilePart<Files.TemporaryFile> filePart = getForm(request).getFilePart();
    try {
      newFilePath = copyFile(filePart.getRef(), "exam", id.toString(), "feedback");
    } catch (IOException e) {
      return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
    }
    Comment comment = exam.getExamFeedback();
    return replaceAndFinish(comment, filePart, newFilePath);
  }

  @Authenticated
  @Pattern(value = "CAN_INSPECT_LANGUAGE")
  @Override
  public CompletionStage<Result> addStatementAttachment(Long id, Http.Request request) {
    LanguageInspection inspection = Ebean.find(LanguageInspection.class).where().eq("exam.id", id).findOne();
    if (inspection == null) {
      return wrapAsPromise(notFound());
    }
    if (inspection.getStatement() == null) {
      Comment comment = new Comment();
      AppUtil.setCreator(comment, request.attrs().get(Attrs.AUTHENTICATED_USER));
      comment.save();
      inspection.setStatement(comment);
      inspection.update();
    }
    FilePart<Files.TemporaryFile> filePart = getForm(request).getFilePart();
    String newFilePath;
    try {
      newFilePath = copyFile(filePart.getRef(), "exam", id.toString(), "inspectionstatement");
    } catch (IOException e) {
      return wrapAsPromise(internalServerError("sitnet_error_creating_attachment"));
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
        Ebean.find(Question.class).where().idEq(id).eq("examSectionQuestions.examSection.exam.creator", user).findOne();
    } else {
      question = Ebean.find(Question.class, id);
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
    if (question == null || question.getEssayAnswer() == null || question.getEssayAnswer().getAttachment() == null) {
      return wrapAsPromise(notFound());
    }
    return serveAttachment(question.getEssayAnswer().getAttachment());
  }

  @Restrict({ @Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT") })
  @Override
  public CompletionStage<Result> downloadExamAttachment(Long id, Http.Request request) {
    // TODO: Authorization?
    Exam exam = Ebean.find(Exam.class, id);
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
      exam = Ebean.find(Exam.class).where().idEq(id).eq("creator", user).findOne();
    } else {
      exam = Ebean.find(Exam.class, id);
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
    ExpressionList<Exam> query = Ebean
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
      return wrapAsPromise(
        internalServerError("Requested file does not exist on disk even though referenced from database!")
      );
    }
    final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.toPath());
    return serveAsBase64Stream(attachment, source);
  }

  private ExamSectionQuestion getExamSectionQuestion(Http.Request request, Long id) {
    User user = request.attrs().get(Attrs.AUTHENTICATED_USER);
    if (user.hasRole(Role.Name.STUDENT)) {
      return Ebean.find(ExamSectionQuestion.class).where().idEq(id).eq("examSection.exam.creator", user).findOne();
    }
    return Ebean.find(ExamSectionQuestion.class, id);
  }

  private String copyFile(Files.TemporaryFile srcFile, String... pathParams) throws IOException {
    String newFilePath = AppUtil.createFilePath(environment, pathParams);
    copyFile(srcFile, new File(newFilePath));
    return newFilePath;
  }

  private void copyFile(Files.TemporaryFile sourceFile, File destFile) throws IOException {
    java.nio.file.Files.copy(
      sourceFile.path(),
      destFile.toPath(),
      StandardCopyOption.REPLACE_EXISTING,
      StandardCopyOption.COPY_ATTRIBUTES
    );
  }
}
