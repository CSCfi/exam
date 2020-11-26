package backend.system

import akka.stream.Materializer
import javax.inject.Inject
import org.joda.time.DateTime
import org.joda.time.format.ISODateTimeFormat
import play.api.mvc.{Filter, RequestHeader, Result}
import play.api.{Logging, mvc}

import scala.concurrent.{ExecutionContext, Future}

object ResultImplicits {
  implicit class EnhancedResult(result: Result) {
    def discardingHeaders(headers: String*): Result =
      result.copy(header = result.header.copy(headers = result.header.headers -- headers))
  }
}

class SystemFilter @Inject()(implicit val mat: Materializer, ec: ExecutionContext)
    extends Filter
    with Logging {

  val Headers = Seq(
    ("x-exam-start-exam", "ongoingExamHash"),
    ("x-exam-upcoming-exam", "upcomingExamHash"),
    ("x-exam-wrong-machine", "wrongMachineData"),
    ("x-exam-unknown-machine", "unknownMachineData"),
    ("x-exam-wrong-room", "wrongRoomData"),
    ("x-exam-wrong-agent-config", "wrongAgent")
  )

  import ResultImplicits._

  private def processResult(src: Result)(implicit request: RequestHeader): Result = {
    val session = src.session match {
      case s if s.isEmpty =>
        request.session match {
          case rs if rs.isEmpty => None
          case rs               => Some(rs)
        }
      case s => Some(s)
    }
    val result = src.withHeaders(("Cache-Control", "no-cache;no-store"),
                                 ("Pragma", "no-cache"),
                                 ("Expires", "0"))
    session match {
      case None => result.withNewSession
      case Some(s) =>
        val (remaining, discarded) = Headers.partition(h => s.get(h._2).isDefined)
        val response = result
          .withHeaders(remaining.map(h => (h._1, s.get(h._2).get)): _*)
          .discardingHeaders(discarded.map(_._1): _*)
        request.path match {
          case path if path.contains("checkSession") =>
            s.get("upcomingExamHash") match {
              case Some(_) => // Don't let session expire when awaiting exam to start
                response.withSession(
                  s + ("since" -> ISODateTimeFormat.dateTime.print(DateTime.now)))
              case _ => response.withSession(s)
            }
          case path if path.contains("logout") => response.withSession(s)
          case _ =>
            response.withSession(s + ("since" -> ISODateTimeFormat.dateTime.print(DateTime.now)))
        }
    }
  }

  override def apply(next: RequestHeader => Future[mvc.Result])(
      rh: RequestHeader): Future[mvc.Result] = rh.path match {
    case "/app/logout" => next.apply(rh)
    case p if p.startsWith("/app") | p.startsWith("/integration") =>
      next.apply(rh).map(processResult(_)(rh))
    case _ => next.apply(rh)
  }

}
