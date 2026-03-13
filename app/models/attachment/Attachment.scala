// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.attachment

import jakarta.persistence.{Entity, Transient}
import models.base.OwnedModel

import scala.compiletime.uninitialized

@Entity
class Attachment extends OwnedModel:
  var fileName: String = uninitialized
  var filePath: String = uninitialized
  var mimeType: String = uninitialized

  @Transient
  var externalId: String = uninitialized

  def copy(): Attachment =
    val a = new Attachment
    a.externalId = externalId
    a.fileName = fileName
    a.mimeType = mimeType
    a.filePath = filePath
    a

trait AttachmentContainer:
  def attachment: Attachment
  def attachment_=(a: Attachment): Unit
  def save(): Unit
