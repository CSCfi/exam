package util.java;

import com.typesafe.config.ConfigFactory;
import play.api.libs.mailer.MailerClient;
import play.libs.mailer.Email;

import javax.inject.Inject;

public class EmailSenderImpl implements EmailSender {

    private static final String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");

    @Inject
    protected MailerClient mailer;

    public void send(String recipient, String sender, String subject, String content) {

        Email email = new Email();
        email.setSubject(subject);
        email.addTo(recipient);
        email.setFrom(String.format("Exam <%s>", SYSTEM_ACCOUNT));
        email.setReplyTo(sender);
        email.setBodyHtml(content);
        mailer.send(email);
    }
}
