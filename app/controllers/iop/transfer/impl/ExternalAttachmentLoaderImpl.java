// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.impl;

import com.fasterxml.jackson.databind.JsonNode;
import controllers.iop.transfer.api.ExternalAttachmentLoader;
import java.io.File;
import java.net.MalformedURLException;
import java.net.URI;
import java.net.URL;
import java.nio.file.Paths;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;
import javax.inject.Inject;
import models.Attachment;
import models.Exam;
import org.apache.pekko.actor.ActorSystem;
import org.apache.pekko.stream.IOResult;
import org.apache.pekko.stream.Materializer;
import org.apache.pekko.stream.javadsl.FileIO;
import org.apache.pekko.stream.javadsl.Source;
import org.apache.pekko.util.ByteString;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.util.ObjectUtils;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;
import util.config.ConfigReader;
import util.file.FileHandler;

public class ExternalAttachmentLoaderImpl implements ExternalAttachmentLoader {

    @Inject
    private ActorSystem actor;

    @Inject
    private WSClient wsClient;

    @Inject
    private FileHandler fileHandler;

    @Inject
    private ConfigReader configReader;

    private final Logger logger = LoggerFactory.getLogger(ExternalAttachmentLoaderImpl.class);

    @Override
    public CompletableFuture<Void> fetchExternalAttachmentsAsLocal(Exam exam) {
        final ArrayList<CompletableFuture<Void>> futures = new ArrayList<>();
        if (exam.getAttachment() != null) {
            futures.add(createFromExternalAttachment(exam.getAttachment(), "exam", exam.getId().toString()));
        }
        exam
            .getExamSections()
            .stream()
            .flatMap(examSection -> examSection.getSectionQuestions().stream())
            .map(sectionQuestion -> {
                if (
                    sectionQuestion.getEssayAnswer() != null && sectionQuestion.getEssayAnswer().getAttachment() != null
                ) {
                    futures.add(
                        createFromExternalAttachment(
                            sectionQuestion.getEssayAnswer().getAttachment(),
                            "question",
                            sectionQuestion.getId().toString(),
                            "answer",
                            sectionQuestion.getEssayAnswer().getId().toString()
                        )
                    );
                }
                return sectionQuestion.getQuestion();
            })
            .filter(question -> question.getAttachment() != null)
            .distinct()
            .forEach(question ->
                futures.add(
                    createFromExternalAttachment(question.getAttachment(), "question", question.getId().toString())
                )
            );
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }

    @Override
    public CompletableFuture<Void> createExternalAttachment(Attachment attachment) {
        if (attachment == null || ObjectUtils.isEmpty(attachment.getFilePath())) {
            return CompletableFuture.completedFuture(null);
        }
        final URL attachmentUrl;
        try {
            attachmentUrl = parseUrl("/api/attachments/");
        } catch (MalformedURLException e) {
            return CompletableFuture.supplyAsync(() -> {
                throw new RuntimeException(e);
            });
        }
        final WSRequest request = wsClient.url(attachmentUrl.toString());
        return request
            .post("")
            .thenAcceptAsync(response -> {
                final JsonNode json = response.asJson();
                final String externalId = json.get("id").asText();
                attachment.setExternalId(externalId);
                File file = new File(attachment.getFilePath());
                if (!file.exists()) {
                    logger.warn(
                        "Could not find file {} for attachment id {}.",
                        file.getAbsoluteFile(),
                        attachment.getId()
                    );
                    return;
                }
                final WSRequest updateRequest;
                try {
                    updateRequest =
                        wsClient.url(parseUrl("/api/attachments/%s", attachment.getExternalId()).toString());
                } catch (MalformedURLException e) {
                    logger.error("Invalid URL!", e);
                    return;
                }
                final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromPath(file.toPath());
                final Http.MultipartFormData.FilePart<Source<ByteString, CompletionStage<IOResult>>> filePart =
                    new Http.MultipartFormData.FilePart<>(
                        "file",
                        attachment.getFileName(),
                        attachment.getMimeType(),
                        source
                    );
                Http.MultipartFormData.DataPart dp = new Http.MultipartFormData.DataPart("key", "value");

                updateRequest
                    .put(Source.from(Arrays.asList(filePart, dp)))
                    .thenAccept(wsResponse -> {
                        if (wsResponse.getStatus() != Http.Status.OK) {
                            logger.warn("File upload {} failed!", file.getAbsoluteFile());
                            return;
                        }
                        logger.info("Uploaded file {} for external exam.", file.getAbsoluteFile());
                    });
            })
            .toCompletableFuture();
    }

    @Override
    public CompletableFuture<Void> uploadAssessmentAttachments(Exam exam) {
        List<CompletableFuture<Void>> futures = new ArrayList<>();
        // Create external attachments.
        if (exam.getAttachment() != null) {
            futures.add(createExternalAttachment(exam.getAttachment()));
        }
        exam
            .getExamSections()
            .stream()
            .flatMap(s -> s.getSectionQuestions().stream())
            .flatMap(sq -> {
                List<Attachment> attachments = new ArrayList<>();
                if (sq.getEssayAnswer() != null && sq.getEssayAnswer().getAttachment() != null) {
                    attachments.add(sq.getEssayAnswer().getAttachment());
                }
                if (sq.getQuestion().getAttachment() != null) {
                    attachments.add(sq.getQuestion().getAttachment());
                }
                return attachments.stream();
            })
            .forEach(a -> futures.add(createExternalAttachment(a)));
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }

    private CompletableFuture<Void> createFromExternalAttachment(Attachment attachment, String... pathParams) {
        return CompletableFuture.runAsync(() -> {
            if (ObjectUtils.isEmpty(attachment.getExternalId())) {
                logger.error("Could not find external ID for an attachment");
                return;
            }
            final URL attachmentUrl;
            try {
                attachmentUrl = parseUrl("/api/attachments/%s/download", attachment.getExternalId());
            } catch (MalformedURLException e) {
                throw new RuntimeException("Invalid URL!", e);
            }
            final WSRequest request = wsClient.url(attachmentUrl.toString());
            request
                .stream()
                .thenAccept(response -> {
                    final String filePath = fileHandler.createFilePath(pathParams);
                    response
                        .getBodyAsSource()
                        .runWith(FileIO.toPath(Paths.get(filePath)), Materializer.createMaterializer(actor))
                        .thenAccept(ioResult -> {
                            attachment.setFilePath(filePath);
                            attachment.save();
                            logger.info(
                                "Saved attachment {} locally as # {}",
                                attachment.getExternalId(),
                                attachment.getId()
                            );
                        });
                });
        });
    }

    private URL parseUrl(String format, Object... args) throws MalformedURLException {
        final String path = args.length < 1 ? format : String.format(format, args);
        return URI.create(configReader.getIopHost() + path).toURL();
    }
}
