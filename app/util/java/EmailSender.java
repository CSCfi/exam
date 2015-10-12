package util.java;

import com.google.inject.ImplementedBy;
import play.libs.mailer.Attachment;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {

    void send(String recipient, String sender, String subject, String content, Attachment... attachments);

}
