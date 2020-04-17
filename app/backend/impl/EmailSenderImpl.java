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

package backend.impl;

import com.google.common.collect.Sets;
import com.typesafe.config.ConfigFactory;
import java.util.Collections;
import java.util.Set;
import java.util.stream.Stream;
import org.apache.commons.mail.DefaultAuthenticator;
import org.apache.commons.mail.EmailAttachment;
import org.apache.commons.mail.EmailException;
import org.apache.commons.mail.HtmlEmail;
import play.Logger;

class EmailSenderImpl implements EmailSender {
    private String SYSTEM_ACCOUNT = ConfigFactory.load().getString("sitnet.email.system.account");
    private String HOST = ConfigFactory.load().getString("play.mailer.host");
    private Integer PORT = ConfigFactory.load().getInt("play.mailer.port");
    private Boolean USE_SSL = ConfigFactory.load().getString("play.mailer.ssl").equals("YES");
    private String USER = ConfigFactory.load().getString("play.mailer.user");
    private String PWD = ConfigFactory.load().getString("play.mailer.password");
    private Boolean USE_MOCK =
        ConfigFactory.load().hasPath("play.mailer.mock") && ConfigFactory.load().getBoolean("play.mailer.mock");

    private static final Logger.ALogger logger = Logger.of(EmailSenderImpl.class);

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
        String subject,
        String content,
        EmailAttachment... attachments
    )
        throws EmailException {
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
        for (String r : recipients) {
            email.addTo(r);
        }
        email.setFrom(String.format("Exam <%s>", SYSTEM_ACCOUNT));
        email.addReplyTo(sender);
        for (String addr : cc) {
            email.addCc(addr);
        }
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
            doSend(Sets.newHashSet(recipient), sender, Collections.emptySet(), subject, content, attachments);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }

    @Override
    public void send(String recipient, String sender, Set<String> cc, String subject, String content) {
        try {
            doSend(Sets.newHashSet(recipient), sender, cc, subject, content);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }

    @Override
    public void send(Set<String> recipients, String sender, Set<String> cc, String subject, String content) {
        try {
            doSend(recipients, sender, cc, subject, content);
        } catch (EmailException e) {
            logger.error("Creating mail failed. Stacktrace follows", e);
        }
    }
}
