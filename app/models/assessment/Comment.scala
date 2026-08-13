// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.assessment

import jakarta.persistence.*
import models.attachment.{Attachment, AttachmentContainer}
import models.base.OwnedModel

import scala.compiletime.uninitialized

@Entity
class Comment extends OwnedModel with AttachmentContainer:
  @Column(columnDefinition = "TEXT")
  var comment: String = uninitialized

  @OneToOne(cascade = Array(CascadeType.ALL))
  var attachment: Attachment = uninitialized

  var feedbackStatus: java.lang.Boolean = uninitialized
