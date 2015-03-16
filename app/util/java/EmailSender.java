package util.java;

import play.libs.mailer.Email;
import play.libs.mailer.MailerPlugin;

public class EmailSender {

    public static void send(String recipient, String sender, String subject, String content) {

        Email email = new Email();
        email.setSubject(subject);
        email.addTo(recipient);
        email.setFrom("Exam <sitnet@arcusys.fi>");
        email.setReplyTo(sender);
        email.setBodyHtml(content);
        MailerPlugin.send(email);
    }
}
