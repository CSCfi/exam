// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail;

import com.typesafe.config.Config;
import java.util.Set;
import javax.inject.Inject;
import org.apache.commons.mail.DefaultAuthenticator;
import org.apache.commons.mail.EmailAttachment;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

public class EmailSenderImpl implements EmailSender {

    private final Logger logger = LoggerFactory.getLogger(EmailSenderImpl.class);
    private final Config config;

    @Inject
    public EmailSenderImpl(Config config) {
        this.config = config;
    }

    private void mockSending(HtmlEmail email, String content, Set<EmailAttachment> attachments) {
        logger.info("mock implementation, send email");
        logger.info("subject: {}", email.getSubject());
        logger.info("from: {}", email.getFromAddress());
        logger.info("body: {}", content);
        email.getToAddresses().forEach(a -> logger.info("to: {}", a));
        email.getReplyToAddresses().forEach(a -> logger.info("replyTo: {}", a));
        email.getCcAddresses().forEach(a -> logger.info("cc: {}", a));
        attachments.forEach(a -> logger.info("attachment: {}", a.getName()));
    }

    private void doSend(
        Set<String> recipients,
        String sender,
        Set<String> cc,
        Set<String> bcc,
        String subject,
        String content,
        Set<EmailAttachment> attachments
    ) throws EmailException {
        HtmlEmail email = new HtmlEmail();
        email.setCharset("utf-8");
        for (EmailAttachment attachment : attachments) {
            email.attach(attachment);
        }
        email.setHostName(config.getString("play.mailer.host"));
        email.setSmtpPort(config.getInt("play.mailer.port"));
        email.setAuthenticator(
            new DefaultAuthenticator(config.getString("play.mailer.user"), config.getString("play.mailer.password"))
        );
        email.setSSLOnConnect(config.getString("play.mailer.ssl").equals("YES"));
        email.setSubject(subject);
        for (String r : recipients) {
            email.addTo(r);
        }
        email.setFrom(String.format("Exam <%s>", config.getString("exam.email.system.account")));
        email.addReplyTo(sender);
        for (String addr : cc) {
            email.addCc(addr);
        }
        for (String addr : bcc) {
            email.addBcc(addr);
        }
        email.setHtmlMsg(content);
        boolean useMock = config.hasPath("play.mailer.mock") && config.getBoolean("play.mailer.mock");
        if (useMock) {
            mockSending(email, content, attachments);
        } else {
            email.send();
        }
    }

    @Override
    public void send(Mail mail) {
        try {
            doSend(mail.recipients, mail.sender, mail.cc, mail.bcc, mail.subject, mail.content, mail.attachments);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }
}
