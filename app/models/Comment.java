// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.OneToOne;
import models.api.AttachmentContainer;
import models.base.OwnedModel;

@Entity
public class Comment extends OwnedModel implements AttachmentContainer {

    @Column(columnDefinition = "TEXT")
    private String comment;

    private Boolean feedbackStatus;

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
    }

    public Boolean getFeedbackStatus() {
        return feedbackStatus;
    }

    public void setFeedbackStatus(Boolean feedbackStatus) {
        this.feedbackStatus = feedbackStatus;
    }

    @Override
    public Attachment getAttachment() {
        return attachment;
    }

    @Override
    public void setAttachment(Attachment attachment) {
        this.attachment = attachment;
    }
}
