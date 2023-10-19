/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package impl;

import com.typesafe.config.Config;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Stream;
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

    private void mockSending(HtmlEmail email, String content, EmailAttachment... attachments) {
        logger.info("mock implementation, send email");
        logger.info("subject: {}", email.getSubject());
        logger.info("from: {}", email.getFromAddress());
        logger.info("body: {}", content);
        email.getToAddresses().forEach(a -> logger.info("to: {}", a));
        email.getReplyToAddresses().forEach(a -> logger.info("replyTo: {}", a));
        email.getCcAddresses().forEach(a -> logger.info("cc: {}", a));
        Stream.of(attachments).forEach(a -> logger.info("attachment: {}", a.getName()));
    }

    private void doSend(
        Set<String> recipients,
        String sender,
        Set<String> cc,
        Set<String> bcc,
        String subject,
        String content,
        EmailAttachment... attachments
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
        email.setFrom(String.format("Exam <%s>", config.getString("sitnet.email.system.account")));
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
    public void send(String recipient, String sender, String subject, String content, EmailAttachment... attachments) {
        try {
            doSend(
                Set.of(recipient),
                sender,
                Collections.emptySet(),
                Collections.emptySet(),
                subject,
                content,
                attachments
            );
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }

    @Override
    public void send(String recipient, String sender, Set<String> cc, String subject, String content) {
        try {
            doSend(Set.of(recipient), sender, cc, Collections.emptySet(), subject, content);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }

    @Override
    public void send(Set<String> recipients, String sender, Set<String> cc, String subject, String content) {
        try {
            doSend(recipients, sender, cc, Collections.emptySet(), subject, content);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }

    @Override
    public void send(String sender, Set<String> bcc, String subject, String content) {
        try {
            doSend(Collections.emptySet(), sender, Collections.emptySet(), bcc, subject, content);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }
}
