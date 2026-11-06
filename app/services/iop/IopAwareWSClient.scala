// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package services.iop

import com.typesafe.config.Config
import org.apache.pekko.util.ByteString
import play.api.libs.ws.*
import play.api.libs.ws.ahc.AhcWSClientProvider

import javax.inject.{Inject, Provider, Singleton}

/** WSClient that adds the [[IopProtocol]] headers to every request addressed to XM, and writes the
  * timestamps in its JSON body the way all EXAM versions can read ([[IopTimestamps]]).
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
    if IopAwareWSClient.addressesXm(iopHost, url) then
      request.addHttpHeaders(headers*).withRequestFilter(IopAwareWSClient.timestamps)
    else request

  override def close(): Unit = delegate.close()

object IopAwareWSClient:
  // Runs when the request is executed, so it sees the final body whichever call site built it
  private val timestamps = WSRequestFilter { next =>
    WSRequestExecutor { request =>
      val normalised = request.body match
        case InMemoryBody(bytes) =>
          IopTimestamps.normalise(bytes).map { json =>
            // Keeps the Content-Type the call site set
            val writable =
              BodyWritable[ByteString](InMemoryBody(_), request.contentType.getOrElse(JsonType))
            request.withBody(json)(using writable)
          }
        case _ => None // multipart uploads and streams carry no JSON
      next(normalised.getOrElse(request))
    }
  }

  private val JsonType = "application/json"

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
