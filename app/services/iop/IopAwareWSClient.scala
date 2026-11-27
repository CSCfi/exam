// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import com.typesafe.config.Config
import play.api.libs.ws.ahc.AhcWSClientProvider
import play.api.libs.ws.{WSClient, WSRequest}

import javax.inject.{Inject, Provider, Singleton}

/** WSClient that adds the [[IopProtocol]] headers to every request addressed to XM.
  *
  * Bound as the application-wide WSClient (see `system.modules.WSClientModule`), so all XM calls
  * carry the headers without each call site having to remember them. Requests to any other host are
  * left untouched.
  */
class IopAwareWSClient(delegate: WSClient, iopHost: String, headers: Seq[(String, String)])
    extends WSClient:

  override def underlying[T]: T = delegate.underlying[T]

  override def url(url: String): WSRequest =
    val request = delegate.url(url)
    if IopAwareWSClient.addressesXm(iopHost, url) then request.addHttpHeaders(headers*)
    else request

  override def close(): Unit = delegate.close()

object IopAwareWSClient:
  /** Whether `url` points at the configured XM host, and not merely at a host sharing its prefix */
  def addressesXm(iopHost: String, url: String): Boolean =
    val host = iopHost.stripSuffix("/")
    host.nonEmpty && (url == host || Seq("/", "?").exists(s => url.startsWith(host + s)))

@Singleton
class IopAwareWSClientProvider @Inject() (ahc: AhcWSClientProvider, config: Config)
    extends Provider[WSClient]:
  lazy val get: WSClient = IopAwareWSClient(
    ahc.get,
    config.getString("exam.integration.iop.host"),
    IopProtocol.requestHeaders(config)
  )
