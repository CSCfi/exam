// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import play.api.Logger

import java.net.URI
import scala.util.Try

/** One log line per cross-organisation request, under the logger name `iop`, carrying the request
  * ID that XM and the other EXAM log as well (see [[IopProtocol.RequestIdHeader]]).
  */
object IopLog:
  private val logger = Logger("iop")

  // Path only: query strings can carry personal data (e.g. ?eppn=…)
  private def pathOf(url: String): String = Try(URI.create(url).getRawPath).toOption.getOrElse("?")

  private def millisSince(startNanos: Long): Long = (System.nanoTime() - startNanos) / 1000000

  def sent(method: String, url: String, id: String, status: Int, startNanos: Long): Unit =
    logger.info(s"IOP → $method ${pathOf(url)} req=$id $status (${millisSince(startNanos)} ms)")

  def notSent(method: String, url: String, id: String, error: Throwable, startNanos: Long): Unit =
    logger.warn(
      s"IOP → $method ${pathOf(url)} req=$id no answer: ${error.getMessage} " +
        s"(${millisSince(startNanos)} ms)"
    )

  def received(
      method: String,
      path: String,
      id: Option[String],
      status: Int,
      startNanos: Long
  ): Unit =
    logger.info(
      s"IOP ← $method $path req=${id.getOrElse("-")} $status (${millisSince(startNanos)} ms)"
    )
