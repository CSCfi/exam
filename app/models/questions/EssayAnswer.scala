// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.questions

import com.fasterxml.jackson.annotation.JsonProperty
import jakarta.persistence.*
import models.attachment.{Attachment, AttachmentContainer}
import models.base.OwnedModel

import scala.compiletime.uninitialized

@Entity
class EssayAnswer extends OwnedModel with AttachmentContainer:
  @OneToOne(cascade = Array(CascadeType.ALL)) var attachment: Attachment = uninitialized

  @JsonProperty var answer: String     = uninitialized
  var evaluatedScore: java.lang.Double = uninitialized

  def copy(): EssayAnswer =
    val ea = new EssayAnswer
    ea.answer = answer
    ea.save()
    if Option(attachment).isDefined then
      val copy = attachment.copy()
      copy.save()
      ea.attachment = copy
    ea
