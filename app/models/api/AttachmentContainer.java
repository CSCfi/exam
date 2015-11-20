package models.api;

import models.Attachment;

public interface AttachmentContainer {

    Attachment getAttachment();

    void setAttachment(Attachment attachment);

    void save();
}
