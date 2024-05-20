// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.attachment;

import java.util.concurrent.CompletionStage;
import play.mvc.Http;
import play.mvc.Result;

public interface LocalAttachmentInterface extends BaseAttachmentInterface<Long> {
    Result deleteQuestionAttachment(Long id);

    CompletionStage<Result> downloadQuestionAttachment(Long id, Http.Request request);

    CompletionStage<Result> deleteQuestionAnswerAttachment(Long qid, Http.Request request);

    CompletionStage<Result> downloadQuestionAnswerAttachment(Long qid, Http.Request request);
}
