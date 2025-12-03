// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail

import com.google.inject.ImplementedBy
import org.apache.commons.mail.EmailAttachment

@ImplementedBy(classOf[EmailSenderImpl])
trait EmailSender:
  def send(mail: Dispatch): Unit

sealed trait Dispatch:
  val sender: String
  val subject: String
  val content: String
  val cc: Set[String]
  val bcc: Set[String]
  val attachments: Set[EmailAttachment]

case class Broadcast(
    recipients: Set[String],
    sender: String,
    subject: String,
    content: String,
    cc: Set[String] = Set.empty,
    bcc: Set[String] = Set.empty,
    attachments: Set[EmailAttachment] = Set.empty
) extends Dispatch

case class Mail(
    recipient: String,
    sender: String,
    subject: String,
    content: String,
    cc: Set[String] = Set.empty,
    bcc: Set[String] = Set.empty,
    attachments: Set[EmailAttachment] = Set.empty
) extends Dispatch
