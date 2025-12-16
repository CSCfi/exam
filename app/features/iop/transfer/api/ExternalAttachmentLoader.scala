// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.iop.transfer.api

import com.google.inject.ImplementedBy
import features.iop.transfer.impl.ExternalAttachmentLoaderImpl
import models.attachment.Attachment
import models.exam.Exam

import scala.concurrent.Future

@ImplementedBy(classOf[ExternalAttachmentLoaderImpl])
trait ExternalAttachmentLoader:
  def fetchExternalAttachmentsAsLocal(exam: Exam): Future[Unit]
  def createExternalAttachment(attachment: Attachment): Future[Unit]
  def uploadAssessmentAttachments(exam: Exam): Future[Unit]
