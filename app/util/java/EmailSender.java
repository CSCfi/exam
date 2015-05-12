package util.java;

import com.typesafe.config.ConfigFactory;
import play.libs.mailer.Email;
import play.libs.mailer.MailerPlugin;

public class EmailSender {

    private static final String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");

    public static void send(String recipient, String sender, String subject, String content) {

        Email email = new Email();
        email.setSubject(subject);
        email.addTo(recipient);
        email.setFrom(String.format("Exam <%s>", SYSTEM_ACCOUNT));
        email.setReplyTo(sender);
        email.setBodyHtml(content);
        MailerPlugin.send(email);
    }
}
