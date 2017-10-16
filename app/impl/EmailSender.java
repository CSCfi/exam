package impl;

import com.google.inject.ImplementedBy;
import org.apache.commons.mail.EmailAttachment;

import java.util.Set;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {

    void send(String recipient, String sender, String subject, String content, EmailAttachment... attachments);
    void send(String recipient, String sender, Set<String> cc, String subject, String content);

}
