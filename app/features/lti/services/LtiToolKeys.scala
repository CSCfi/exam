// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package features.lti.services

import com.google.inject.ImplementedBy
import com.nimbusds.jose.jwk.{JWKSet, RSAKey}
import play.api.Logging

import java.net.URI
import java.net.http.{HttpClient, HttpRequest, HttpResponse}
import java.time.{Clock, Duration, Instant}
import javax.inject.{Inject, Singleton}
import scala.collection.concurrent.TrieMap
import scala.jdk.CollectionConverters.*
import scala.util.Try

/** The public keys a tool signs its messages to the platform with, from its JWK set (`jwks-url`).
  */
@ImplementedBy(classOf[HttpLtiToolKeys])
trait LtiToolKeys:
  /** The RSA key with this key id, or the only one there is when the message names none. */
  def key(jwksUrl: String, keyId: Option[String]): Either[LtiError, RSAKey]

/** Fetches a tool's JWK set and keeps it. A key id it does not know makes it fetch the set again,
  * since tools rotate their keys, but at most once a minute per tool: anyone can post a message
  * naming a made-up key id, and that must not turn into a request to the tool every time.
  */
@Singleton
class HttpLtiToolKeys @Inject() () extends LtiToolKeys with Logging:

  private val RefetchInterval = Duration.ofMinutes(1)
  private val Timeout         = Duration.ofSeconds(10)

  private val clock  = Clock.systemUTC()
  private val client = HttpClient.newBuilder().connectTimeout(Timeout).build()
  private val sets   = TrieMap.empty[String, (JWKSet, Instant)]

  override def key(jwksUrl: String, keyId: Option[String]): Either[LtiError, RSAKey] =
    val cached = sets.get(jwksUrl)
    cached.flatMap((set, _) => find(set, keyId)) match
      case Some(key) => Right(key)
      case None if cached.exists((_, at) => at.plus(RefetchInterval).isAfter(clock.instant)) =>
        Left(LtiError.InvalidDeepLinkResponse("the tool has no key with this key id"))
      case None =>
        fetch(jwksUrl).flatMap { set =>
          sets.put(jwksUrl, (set, clock.instant))
          find(set, keyId).toRight(
            LtiError.InvalidDeepLinkResponse("the tool has no key with this key id")
          )
        }

  private def find(set: JWKSet, keyId: Option[String]): Option[RSAKey] =
    val keys = keyId match
      case Some(id) => Option(set.getKeyByKeyId(id)).toList
      case None     => set.getKeys.asScala.toList
    keys match
      case (key: RSAKey) :: Nil => Some(key)
      case _                    => None

  private def fetch(jwksUrl: String): Either[LtiError, JWKSet] =
    def failed(reason: String) =
      logger.error(s"Could not fetch the LTI tool keys from $jwksUrl: $reason")
      LtiError.ToolKeysUnavailable
    for
      response <- Try {
        val request = HttpRequest.newBuilder(URI(jwksUrl)).timeout(Timeout).GET().build()
        client.send(request, HttpResponse.BodyHandlers.ofString())
      }.toEither.left.map(e => failed(e.toString))
      body <- Either.cond(
        response.statusCode == 200,
        response.body,
        failed(s"status ${response.statusCode}")
      )
      set <- Try(JWKSet.parse(body)).toEither.left.map(e => failed(e.toString))
    yield set
