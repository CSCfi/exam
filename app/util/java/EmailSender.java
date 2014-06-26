package util.java;

import com.typesafe.plugin.MailerAPI;
import com.typesafe.plugin.MailerPlugin;
import play.libs.F;
import play.mvc.Result;

import static play.mvc.Results.ok;

/**
 * Created by alahtinen on 21.5.2014.
 */
public class EmailSender {

    public static void sendInspectorNotification(final String recipient, final String sender, final String subject, final String content) {

        // async send mail
        // http://www.playframework.com/documentation/2.2.x/JavaAkka
        F.Promise<Integer> promiseOfInt = F.Promise.promise(new F.Function0<Integer>() {
            public Integer apply() {
                MailerAPI mail = play.Play.application().plugin(MailerPlugin.class).email();

                mail.setSubject(subject);
                mail.setRecipient(recipient);
                mail.setFrom("Tenttisovellus <sitnet@arcusys.fi>");
                mail.setReplyTo(sender);
                mail.sendHtml(content);
                return new Integer(0);
            }
        });

        promiseOfInt.map(new F.Function<Integer, Result>() {
            public Result apply(Integer i) {
                return ok();
            }
        });
    }


    public static void send(final String recipient, final String sender, final String subject, final String content) {

        // async send mail
        // http://www.playframework.com/documentation/2.2.x/JavaAkka
        F.Promise<Integer> promiseOfInt = F.Promise.promise(new F.Function0<Integer>() {
            public Integer apply() {
                MailerAPI mail = play.Play.application().plugin(MailerPlugin.class).email();

                mail.setSubject(subject);
                mail.setRecipient(recipient);
                mail.setFrom("Exam <sitnet@arcusys.fi>");
                mail.setReplyTo(sender);
                mail.sendHtml(content);
                return new Integer(0);
            }
        });

        promiseOfInt.map(new F.Function<Integer, Result>() {
            public Result apply(Integer i) {
                return ok();
            }
        });
    }
}
