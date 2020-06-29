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

import backend.controllers.iop.transfer.impl.ExternalAttachmentLoaderImpl;
import backend.models.Attachment;
import backend.models.Exam;
import com.google.inject.ImplementedBy;
import java.util.concurrent.CompletableFuture;

@ImplementedBy(ExternalAttachmentLoaderImpl.class)
public interface ExternalAttachmentLoader {
    CompletableFuture<Void> fetchExternalAttachmentsAsLocal(Exam exam);

    CompletableFuture<Void> createExternalAttachment(Attachment attachment);

    CompletableFuture<Void> uploadAssessmentAttachments(Exam exam);
}
