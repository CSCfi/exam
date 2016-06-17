package models;

import models.api.AttachmentContainer;
import models.base.OwnedModel;

import javax.persistence.CascadeType;
import javax.persistence.Column;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

@Entity
public class Comment extends OwnedModel implements AttachmentContainer {

    @Column(columnDefinition = "TEXT")
    private String comment;

    @OneToOne(cascade = CascadeType.ALL)
    private Attachment attachment;

    public String getComment() {
        return comment;
    }

    public void setComment(String comment) {
        this.comment = comment;
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
