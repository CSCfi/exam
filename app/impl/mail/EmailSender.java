// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail;

import com.google.inject.ImplementedBy;
import java.util.HashSet;
import java.util.Set;
import org.apache.commons.mail.EmailAttachment;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {
    void send(Mail mail);

    class Mail {

        Set<String> recipients = new HashSet<>();
        String sender;
        String subject;
        String content;
        Set<String> cc = new HashSet<>();
        Set<String> bcc = new HashSet<>();
        Set<EmailAttachment> attachments = new HashSet<>();

        public Mail recipient(String recipient) {
            this.recipients.add(recipient);
            return this;
        }

        public Mail recipient(Set<String> recipients) {
            this.recipients.addAll(recipients);
            return this;
        }

        public Mail sender(String sender) {
            this.sender = sender;
            return this;
        }

        public Mail subject(String subject) {
            this.subject = subject;
            return this;
        }

        public Mail content(String content) {
            this.content = content;
            return this;
        }

        public Mail cc(String cc) {
            this.cc.add(cc);
            return this;
        }

        public Mail cc(Set<String> cc) {
            this.cc.addAll(cc);
            return this;
        }

        public Mail bcc(String bcc) {
            this.bcc.add(bcc);
            return this;
        }

        public Mail bcc(Set<String> bcc) {
            this.bcc.addAll(bcc);
            return this;
        }

        public Mail attachment(EmailAttachment attachment) {
            this.attachments.add(attachment);
            return this;
        }

        public Mail attachment(Set<EmailAttachment> attachments) {
            this.attachments.addAll(attachments);
            return this;
        }
    }
}
