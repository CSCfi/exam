package models.answers;

import models.Attachment;


public interface AnswerInterface {

    String getType();

    Attachment getAttachment();

    void setAttachment(Attachment attachment);

}
