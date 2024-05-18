// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl;

import com.google.inject.ImplementedBy;
import java.util.Set;
import org.apache.commons.mail.EmailAttachment;

@ImplementedBy(EmailSenderImpl.class)
public interface EmailSender {
    void send(String recipient, String sender, String subject, String content, EmailAttachment... attachments);
    void send(String recipient, String sender, Set<String> cc, String subject, String content);
    void send(Set<String> recipients, String sender, Set<String> cc, String subject, String content);
    void send(String sender, Set<String> bcc, String subject, String content);
}
