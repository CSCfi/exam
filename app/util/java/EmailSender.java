package util.java;

import com.typesafe.plugin.*;

/**
 * Created by alahtinen on 21.5.2014.
 */
public class EmailSender {

    public static void sendInspectorNotification(String recipient, String sender, String subject, String content) {

        MailerAPI mail = play.Play.application().plugin(MailerPlugin.class).email();

        mail.setSubject(subject);
        mail.setRecipient(recipient);
        mail.setFrom("Tenttisovellus <sitnet@arcusys.fi>");
        mail.setReplyTo(sender);
        //sends html
        mail.sendHtml(content);

    }
}
