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

import backend.controllers.iop.collaboration.CollaborativeAttachmentInterface;
import backend.models.json.ExternalExam;
import play.mvc.Result;
import play.mvc.Results;

import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public interface ExternalAttachmentInterface extends CollaborativeAttachmentInterface<String, ExternalExam> {

    @Override
    default CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, String eid) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> downloadFeedbackAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> downloadStatementAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addAttachmentToQuestion() {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addAttachmentToExam() {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteExamAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addFeedbackAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> addStatementAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteQuestionAttachment(String eid, Long qid) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteFeedbackAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }

    @Override
    default CompletionStage<Result> deleteStatementAttachment(String id) {
        return CompletableFuture.supplyAsync(Results::badRequest);
    }
}
