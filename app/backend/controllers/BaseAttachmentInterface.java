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

package backend.controllers;

import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.util.file.ChunkMaker;
import backend.models.Attachment;
import backend.models.Exam;
import backend.models.ExamSectionQuestion;
import be.objectify.deadbolt.java.actions.Group;
import be.objectify.deadbolt.java.actions.Pattern;
import be.objectify.deadbolt.java.actions.Restrict;
import play.mvc.Result;

import java.util.Base64;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

import static play.mvc.Results.ok;

public interface BaseAttachmentInterface<T> {
    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    CompletionStage<Result> downloadExamAttachment(T id);

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    CompletionStage<Result> addAttachmentToQuestion();

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    CompletionStage<Result> addAttachmentToExam();

    @Restrict({@Group("STUDENT")})
    CompletionStage<Result> addAttachmentToQuestionAnswer();

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    CompletionStage<Result> deleteExamAttachment(T id);

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    CompletionStage<Result> addFeedbackAttachment(T id);

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    CompletionStage<Result> downloadFeedbackAttachment(T id);

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    CompletionStage<Result> addStatementAttachment(T id);

    @Restrict({@Group("TEACHER"), @Group("ADMIN"), @Group("STUDENT")})
    CompletionStage<Result> downloadStatementAttachment(T id);

    @Restrict({@Group("TEACHER"), @Group("ADMIN")})
    CompletionStage<Result> deleteFeedbackAttachment(T id);

    @Pattern(value = "CAN_INSPECT_LANGUAGE")
    CompletionStage<Result> deleteStatementAttachment(T id);

    default CompletionStage<Result> serveAsBase64Stream(Attachment attachment, Source<ByteString, ?> source) {
        return serveAsBase64Stream(attachment.getMimeType(), attachment.getFileName(), source);
    }

    default CompletionStage<Result> serveAsBase64Stream(String mimeType, String fileName, Source<ByteString, ?> source) {
        return CompletableFuture.supplyAsync(() -> ok().chunked(source.via(new ChunkMaker(3 * 1024))
                .map(byteString -> {
                    final byte[] encoded = Base64.getEncoder().encode(byteString.toArray());
                    return ByteString.fromArray(encoded);
                })).as(mimeType)
                .withHeader("Content-Disposition", "attachment; filename=\"" + fileName + "\""));
    }

    default ExamSectionQuestion getExamSectionQuestion(Long qid, Exam exam) {
        return exam.getExamSections().stream()
                .flatMap(es -> es.getSectionQuestions().stream())
                .filter(q -> q.getId().equals(qid))
                .findFirst().orElse(null);
    }
}
