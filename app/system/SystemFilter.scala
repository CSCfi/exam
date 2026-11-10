// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package system

import com.typesafe.config.Config
import org.apache.pekko.stream.Materializer
import play.api.mvc.{Filter, RequestHeader, Result}
import services.iop.{IopLog, IopProtocol, IopTimestamps}

import java.time.Instant
import java.time.format.DateTimeFormatter
import javax.inject.Inject
import scala.concurrent.{ExecutionContext, Future}

class SystemFilter @Inject() (config: Config)(implicit val mat: Materializer, ec: ExecutionContext)
    extends Filter:

  // Tells XM which protocol version answered a proxied IOP request
  private val iopHeaders = IopProtocol.responseHeaders(config)

  val Headers: Seq[(String, String)] = Seq(
    ("x-exam-start-exam", "ongoingExamHash"),
    ("x-exam-upcoming-exam", "upcomingExamHash"),
    ("x-exam-wrong-machine", "wrongMachineData"),
    ("x-exam-unknown-machine", "unknownMachineData"),
    ("x-exam-wrong-room", "wrongRoomData"),
    ("x-exam-wrong-agent-config", "wrongAgent"),
    ("x-exam-aquarium-login", "aquariumLogin")
  )

  extension (result: Result)
    private def discardingHeaders(headers: String*): Result =
      result.copy(header = result.header.copy(headers = result.header.headers -- headers))

  private def processResult(src: Result)(implicit request: RequestHeader): Result =
    val session = src.session match
      case s if s.isEmpty =>
        request.session match {
          case rs if rs.isEmpty => None
          case rs               => Some(rs)
        }
      case s => Some(s)
    val result = src.withHeaders(
      ("Cache-Control", "no-cache;no-store"),
      ("Pragma", "no-cache"),
      ("Expires", "0")
    )
    session match
      // No session came with the request. Clearing the cookie would do nothing when there is
      // none, and harm when the browser has one but left it out: Firefox leaves EXAM's SameSite=Lax
      // cookie out of the LTI tool's cross-site redirect back to EXAM, yet applies a Set-Cookie
      // clearing it, which logged the user out of EXAM on every launch.
      case None => result
      case Some(s) =>
        val (remaining, discarded) = Headers.partition(h => s.get(h._2).isDefined)
        val response = result
          .withHeaders(remaining.map(h => (h._1, s.get(h._2).get))*)
          .discardingHeaders(discarded.map(_._1)*)
        request.path match
          case path if path == "/app/session" && request.method == "GET" =>
            s.get("upcomingExamHash") match {
              case Some(_) => // Don't let the session expire when awaiting the exam to start
                response.withSession(
                  s + ("since" -> DateTimeFormatter.ISO_INSTANT.format(Instant.now()))
                )
              case _ => response.withSession(s)
            }
          case path if path.contains("logout") => response.withSession(s)
          case _ =>
            response.withSession(
              s + ("since" -> DateTimeFormatter.ISO_INSTANT.format(Instant.now()))
            )

  override def apply(next: RequestHeader => Future[Result])(rh: RequestHeader): Future[Result] =
    rh.path match
      case "/app/logout" => next.apply(rh)
      case p if p.startsWith("/integration/iop/") =>
        val id    = rh.headers.get(IopProtocol.RequestIdHeader).filter(IopProtocol.isRequestId)
        val start = System.nanoTime()
        next.apply(rh).map { r =>
          val result =
            IopTimestamps.normalise(processResult(r)(using rh)).withHeaders(iopHeaders*)
          IopLog.received(rh.method, rh.path, id, result.header.status, start)
          id.fold(result)(i => result.withHeaders(IopProtocol.RequestIdHeader -> i))
        }
      // Disable caching for the index page so that CSRF cookie can be injected without worries
      case p if p.startsWith("/app") | p.startsWith("/integration") =>
        next.apply(rh).map(processResult(_)(using rh))
      case _ =>
        next.apply(rh).map(
          _.withHeaders(
            ("Cache-Control", "no-cache, no-store, must-revalidate"),
            ("Pragma", "no-cache"),
            ("Expires", "0")
          )
        )
