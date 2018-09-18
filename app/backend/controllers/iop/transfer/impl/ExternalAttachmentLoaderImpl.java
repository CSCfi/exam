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

package backend.controllers.iop.transfer.impl;

import akka.actor.ActorSystem;
import akka.stream.ActorMaterializer;
import akka.stream.IOResult;
import akka.stream.javadsl.FileIO;
import akka.stream.javadsl.Source;
import akka.util.ByteString;
import backend.controllers.iop.transfer.api.ExternalAttachmentLoader;
import backend.models.Attachment;
import backend.models.Exam;
import backend.util.AppUtil;
import com.fasterxml.jackson.databind.JsonNode;
import com.typesafe.config.ConfigFactory;
import org.springframework.util.StringUtils;
import play.Environment;
import play.Logger;
import play.libs.ws.WSClient;
import play.libs.ws.WSRequest;
import play.mvc.Http;

import javax.inject.Inject;
import java.io.File;
import java.net.MalformedURLException;
import java.net.URL;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.CompletionStage;

public class ExternalAttachmentLoaderImpl implements ExternalAttachmentLoader {

    @Inject
    private ActorSystem actor;

    @Inject
    private WSClient wsClient;

    @Inject
    private Environment environment;

    public CompletableFuture<Void> fetchExternalAttachmentsAsLocal(Exam exam) {
        final ArrayList<CompletableFuture<Void>> futures = new ArrayList<>();
        if (exam.getAttachment() != null) {
            futures.add(createFromExternalAttachment(exam.getAttachment(), "exam",
                    exam.getId().toString()));
        }
        exam.getExamSections().stream()
                .flatMap(examSection -> examSection.getSectionQuestions().stream())
                .map(sectionQuestion -> {
                    if (sectionQuestion.getEssayAnswer() != null &&
                            sectionQuestion.getEssayAnswer().getAttachment() != null) {
                        futures.add(createFromExternalAttachment(sectionQuestion.getEssayAnswer().getAttachment(),
                                "question", sectionQuestion.getId().toString(),
                                "answer", sectionQuestion.getEssayAnswer().getId().toString()));
                    }
                    return sectionQuestion.getQuestion();
                })
                .filter(question -> question.getAttachment() != null)
                .distinct()
                .forEach(question -> futures.add(createFromExternalAttachment(question.getAttachment(),
                        "question", question.getId().toString())));
        return CompletableFuture.allOf(futures.toArray(new CompletableFuture[0]));
    }

    @Override
    public CompletableFuture<Void> createExternalAttachment(WSRequest request, Attachment attachment) {
        return request.post("")
                .thenAcceptAsync(response -> {
                    final JsonNode json = response.asJson();
                    final String externalId = json.get("id").asText();
                    attachment.setExternalId(externalId);
                    File file = new File(attachment.getFilePath());
                    if (!file.exists()) {
                        Logger.warn("Could not find file {} for attachment id {}.",
                                file.getAbsoluteFile(), attachment.getId());
                        return;
                    }
                    final WSRequest updateRequest;
                    try {
                        updateRequest = wsClient.url(parseUrl("/api/attachments/%s",
                                attachment.getExternalId()).toString());
                    } catch (MalformedURLException e) {
                        Logger.error("Invalid URL!", e);
                        return;
                    }
                    final Source<ByteString, CompletionStage<IOResult>> source = FileIO.fromFile(file);
                    final Http.MultipartFormData.FilePart<Source<ByteString, CompletionStage<IOResult>>> filePart =
                            new Http.MultipartFormData.FilePart<>("file",
                                    attachment.getFileName(), attachment.getMimeType(), source);
                    Http.MultipartFormData.DataPart dp = new Http.MultipartFormData.DataPart("key", "value");

                    updateRequest.put(Source.from(Arrays.asList(filePart, dp)))
                            .thenAccept(wsResponse -> {
                                if (wsResponse.getStatus() != 200) {
                                    Logger.warn("File upload {} failed!", file.getAbsoluteFile());
                                    return;
                                }
                                Logger.info("Uploaded file {} for external exam.", file.getAbsoluteFile());
                            });
                }).toCompletableFuture();
    }

    private CompletableFuture<Void> createFromExternalAttachment(Attachment attachment, String... pathParams) {
        return CompletableFuture.runAsync(() -> {
            if (StringUtils.isEmpty(attachment.getExternalId())) {
                return;
            }
            final URL attachmentUrl;
            try {
                attachmentUrl = parseUrl("/api/attachments/%s/download", attachment.getExternalId());
            } catch (MalformedURLException e) {
                Logger.error("Invalid URL!", e);
                return;
            }
            final WSRequest request = wsClient.url(attachmentUrl.toString());
            request.stream()
                    .thenAccept(response -> {
                        final String filePath = AppUtil.createFilePath(environment, pathParams);
                        response.getBodyAsSource()
                                .runWith(FileIO.toFile(new File(filePath)), ActorMaterializer.create(actor))
                                .thenAccept(ioResult -> {
                                    if (!ioResult.wasSuccessful()) {
                                        Logger.error("Could not write file " + filePath + " to disk!");
                                        return;
                                    }
                                    attachment.setFilePath(filePath);
                                    attachment.save();
                                });
                    });
        });
    }

    private static URL parseUrl(String format, Object... args) throws MalformedURLException {
        final String path = args.length < 1 ? format : String.format(format, args);
        return new URL(ConfigFactory.load().getString("sitnet.integration.iop.host")
                + path);
    }
}
