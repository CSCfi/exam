// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.api;

import controllers.iop.collaboration.api.CollaborativeAttachmentInterface;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import models.iop.ExternalExam;
import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

public interface ExternalAttachmentInterface extends CollaborativeAttachmentInterface<String, ExternalExam> {
    @Override
    default CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, String eid, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> downloadFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> downloadStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> addAttachmentToQuestion(Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> addAttachmentToExam(Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> deleteExamAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> addFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> addStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> deleteQuestionAttachment(String eid, Long qid, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> deleteFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }

    @Override
    default CompletionStage<Result> deleteStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.completedFuture(Results.badRequest());
    }
}
