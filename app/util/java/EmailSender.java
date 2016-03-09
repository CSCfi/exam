package util.java;

import com.google.inject.ImplementedBy;
import org.apache.commons.mail.EmailAttachment;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {

    void send(String recipient, String sender, String subject, String content, EmailAttachment... attachments);

}
