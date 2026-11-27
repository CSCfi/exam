// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import com.typesafe.config.Config

/** Version of the wire format that EXAM installations exchange through XM.
  *
  * Bump [[Version]] whenever an IOP payload changes shape, and add the matching translation step to
  * XM. The release version travels alongside for information only. XM records both per organisation
  * and treats a missing protocol header as protocol 0 (installations from before this header
  * existed).
  */
object IopProtocol:
  val Version = 1

  val ProtocolHeader     = "X-Iop-Protocol"
  val ExamVersionHeader  = "X-Exam-Version"
  val OrganisationHeader = "X-Exam-Org"

  /** Headers identifying this installation, sent with every request to XM */
  def requestHeaders(config: Config): Seq[(String, String)] =
    responseHeaders(config) ++
      Option(config.getString("exam.integration.iop.organisationRef"))
        .filter(_.nonEmpty)
        .map(OrganisationHeader -> _)

  /** Headers telling XM which version answered a proxied request */
  def responseHeaders(config: Config): Seq[(String, String)] = Seq(
    ProtocolHeader    -> Version.toString,
    ExamVersionHeader -> config.getString("exam.release.version")
  )
