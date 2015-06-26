package util.java;

import com.google.inject.ImplementedBy;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {

    void send(String recipient, String sender, String subject, String content);

}
