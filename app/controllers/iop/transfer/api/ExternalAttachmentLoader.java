// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.iop.transfer.api;

import com.google.inject.ImplementedBy;
import controllers.iop.transfer.impl.ExternalAttachmentLoaderImpl;
import java.util.concurrent.CompletableFuture;
import models.Attachment;
import models.Exam;

@ImplementedBy(ExternalAttachmentLoaderImpl.class)
public interface ExternalAttachmentLoader {
    CompletableFuture<Void> fetchExternalAttachmentsAsLocal(Exam exam);

    CompletableFuture<Void> createExternalAttachment(Attachment attachment);

    CompletableFuture<Void> uploadAssessmentAttachments(Exam exam);
}
