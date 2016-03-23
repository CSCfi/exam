package util.java;

import com.typesafe.config.ConfigFactory;
import org.apache.commons.mail.DefaultAuthenticator;
import org.apache.commons.mail.EmailAttachment;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
import play.Logger;

import java.util.stream.Stream;

class EmailSenderImpl implements EmailSender {

    private String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");
    private String HOST = ConfigFactory.load().getString("play.mailer.host");
    private Integer PORT = ConfigFactory.load().getInt("play.mailer.port");
    private Boolean USE_SSL = ConfigFactory.load().getString("play.mailer.ssl").equals("YES");
    private String USER = ConfigFactory.load().getString("play.mailer.user");
    private String PWD = ConfigFactory.load().getString("play.mailer.password");
    private Boolean USE_MOCK = ConfigFactory.load().hasPath("play.mailer.mock") && ConfigFactory.load().getBoolean("play.mailer.mock");


    private void mockSending(HtmlEmail email, String content, EmailAttachment... attachments) {
        Logger.info("mock implementation, send email");
        Logger.info("subject: {}", email.getSubject());
        Logger.info("from: {}", email.getFromAddress());
        Logger.info("body: {}", content);
        email.getToAddresses().forEach(a -> Logger.info("to: {}", a));
        email.getReplyToAddresses().forEach(a -> Logger.info("replyTo: {}", a));
        Stream.of(attachments).forEach(a -> Logger.info("attachment: {}", a.getName()));
    }

    private void doSend(String recipient, String sender, String subject, String content,
                        EmailAttachment... attachments) throws EmailException {
        HtmlEmail email = new HtmlEmail();
        email.setCharset("utf-8");
        for (EmailAttachment attachment : attachments) {
            email.attach(attachment);
        }
        email.setHostName(HOST);
        email.setSmtpPort(PORT);
        email.setAuthenticator(new DefaultAuthenticator(USER, PWD));
        email.setSSLOnConnect(USE_SSL);
        email.setSubject(subject);
        email.addTo(recipient);
        email.setFrom(String.format("Exam <%s>", SYSTEM_ACCOUNT));
        email.addReplyTo(sender);
        email.setHtmlMsg(content);
        if (USE_MOCK) {
            mockSending(email, content, attachments);
        } else {
            email.send();
        }
    }

    @Override
    public void send(String recipient, String sender, String subject, String content, EmailAttachment... attachments) {
        try {
            doSend(recipient, sender, subject, content, attachments);
        } catch (EmailException e) {
            Logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }
}
