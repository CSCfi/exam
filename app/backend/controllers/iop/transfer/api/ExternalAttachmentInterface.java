/*
 * Copyright (c) 2018 Exam Consortium
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
 *
 */

package backend.controllers.iop.transfer.api;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import play.mvc.Http;
import play.mvc.Result;
import play.mvc.Results;

import backend.controllers.iop.collaboration.api.CollaborativeAttachmentInterface;
import backend.models.json.ExternalExam;

public interface ExternalAttachmentInterface extends CollaborativeAttachmentInterface<String, ExternalExam> {

    @Override
    default CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, String eid, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> downloadFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> downloadStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addAttachmentToQuestion(Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addAttachmentToExam(Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteExamAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteQuestionAttachment(String eid, Long qid, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteFeedbackAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteStatementAttachment(String id, Http.Request request) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }
}
