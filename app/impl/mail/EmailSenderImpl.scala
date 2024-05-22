// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package impl.mail

import com.typesafe.config.Config
import org.apache.commons.mail._
import play.api.Logging

import javax.inject.Inject
import scala.jdk.CollectionConverters._
import scala.util.control.Exception.catching

class EmailSenderImpl @Inject() (private val config: Config) extends EmailSender with Logging:

  private def mockSending(email: HtmlEmail, content: String, attachments: Set[EmailAttachment]): Unit =
    logger.info("mock implementation, send email")
    val to   = email.getToAddresses.asScala.mkString(", ")
    val cc   = email.getCcAddresses.asScala.mkString(", ")
    val bcc  = email.getReplyToAddresses.asScala.mkString(", ")
    val att = attachments.map(_.getName).mkString(", ")
    logger.info(s"""
        |Following email was sent:
        |subject: ${email.getSubject}
        |from: ${email.getFromAddress}
        |to: $to
        |cc: $cc
        |bcc: $bcc
        |attachments: $att
        |body: $content
        |""".stripMargin)

  private def doSend(
      recipients: Set[String],
      sender: String,
      cc: Set[String],
      bcc: Set[String],
      subject: String,
      content: String,
      attachments: Set[EmailAttachment]
  ): Unit =
    val email = new HtmlEmail
    email.setCharset("utf-8")
    attachments.foreach(email.attach)
    email.setHostName(config.getString("play.mailer.host"))
    email.setSmtpPort(config.getInt("play.mailer.port"))
    email.setAuthenticator(
      new DefaultAuthenticator(config.getString("play.mailer.user"), config.getString("play.mailer.password"))
    )
    email.setSSLOnConnect(config.getString("play.mailer.ssl") == "YES")
    email.setSubject(subject)
    recipients.foreach(email.addTo)
    email.setFrom(String.format("Exam <%s>", config.getString("exam.email.system.account")))
    email.addReplyTo(sender)
    cc.foreach(email.addCc)
    bcc.foreach(email.addBcc)
    email.setHtmlMsg(content)
    if config.hasPath("play.mailer.mock") && config.getBoolean("play.mailer.mock") then
      mockSending(email, content, attachments)
    else email.send

  override def send(dispatch: Dispatch): Unit =
    val recipients = dispatch match
      case bc: Broadcast => bc.recipients
      case m: Mail       => Set(m.recipient)

    catching(classOf[EmailException]).either(
      doSend(
        recipients,
        dispatch.sender,
        dispatch.cc,
        dispatch.bcc,
        dispatch.subject,
        dispatch.content,
        dispatch.attachments
      )
    ) match
      case Left(e) => logger.error("Sending mail failed with", e)
      case _       => // OK
