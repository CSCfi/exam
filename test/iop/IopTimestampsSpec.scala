// SPDX-FileCopyrightText: The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package iop

import org.apache.pekko.actor.ActorSystem
import org.apache.pekko.stream.Materializer
import org.apache.pekko.stream.scaladsl.{Sink, Source}
import org.apache.pekko.util.ByteString
import org.scalatest.matchers.must.Matchers
import org.scalatest.wordspec.AnyWordSpec
import play.api.http.{HttpChunk, HttpEntity}
import play.api.libs.json.*
import play.api.mvc.Results
import services.iop.IopTimestamps

import scala.concurrent.Await
import scala.concurrent.duration.*

class IopTimestampsSpec extends AnyWordSpec with Matchers:

  private def norm(s: String) = IopTimestamps.normalise(JsString(s))

  "normalise" should {
    "add milliseconds when there are none" in {
      norm("2026-01-15T09:00:00Z") mustBe JsString("2026-01-15T09:00:00.000Z")
    }
    "cut microseconds and nanoseconds to milliseconds" in {
      norm("2026-01-15T09:00:00.123456Z") mustBe JsString("2026-01-15T09:00:00.123Z")
      norm("2026-01-15T09:00:00.123456789Z") mustBe JsString("2026-01-15T09:00:00.123Z")
    }
    "pad shorter fractions" in {
      norm("2026-01-15T09:00:00.1Z") mustBe JsString("2026-01-15T09:00:00.100Z")
    }
    "leave millisecond timestamps as they are" in {
      norm("2014-05-01T08:00:00.123Z") mustBe JsString("2014-05-01T08:00:00.123Z")
    }
    "leave other strings alone" in {
      Seq("2026-01-15", "09:00", "hello", "2026-01-15T09:00:00+02:00", "x 2026-01-15T09:00:00Z")
        .foreach(s => norm(s) mustBe JsString(s))
    }
    "go through objects and arrays, keeping field order" in {
      val json = Json.obj(
        "b"     -> "2026-01-15T09:00:00Z",
        "a"     -> Json.arr(Json.obj("t" -> "2026-01-15T10:00:00.5Z")),
        "n"     -> 1,
        "empty" -> JsNull
      )
      val result = IopTimestamps.normalise(json).as[JsObject]
      result.keys.toSeq mustBe Seq("b", "a", "n", "empty")
      (result \ "b").as[String] mustBe "2026-01-15T09:00:00.000Z"
      (result \ "a" \ 0 \ "t").as[String] mustBe "2026-01-15T10:00:00.500Z"
      (result \ "n").as[Int] mustBe 1
    }
  }

  "normalise bytes" should {
    "rewrite JSON objects and arrays" in {
      val out = IopTimestamps.normalise(ByteString(""" [{"t":"2026-01-15T09:00:00Z"}]"""))
      out.map(_.utf8String) mustBe Some("""[{"t":"2026-01-15T09:00:00.000Z"}]""")
    }
    "leave anything else alone" in {
      IopTimestamps.normalise(ByteString("2026-01-15T09:00:00Z")) mustBe None
      IopTimestamps.normalise(ByteString("{not json")) mustBe None
      IopTimestamps.normalise(ByteString.empty) mustBe None
    }
  }

  "normalise result" should {
    "rewrite a JSON response" in {
      val result = IopTimestamps.normalise(Results.Ok(Json.obj("t" -> "2026-01-15T09:00:00Z")))
      result.body match
        case HttpEntity.Strict(data, ct) =>
          data.utf8String must include("09:00:00.000Z")
          ct mustBe Some("application/json")
        case other => fail(s"unexpected body $other")
    }
    "leave other responses alone" in {
      val text = Results.Ok("2026-01-15T09:00:00Z")
      IopTimestamps.normalise(text) mustBe text
    }
    "rewrite a chunked JSON response chunk by chunk" in {
      val system         = ActorSystem("IopTimestampsSpec")
      given Materializer = Materializer(system)
      try
        val pages = Source(List("[", """{"t":"2026-01-15T09:00:00Z"}""", ",", """{"t":"x"}""", "]"))
        val result =
          IopTimestamps.normalise(
            Results.Ok.chunked(pages.map(ByteString(_))).as("application/json")
          )
        result.body match
          case HttpEntity.Chunked(chunks, _) =>
            val body = Await.result(
              chunks.collect { case HttpChunk.Chunk(d) => d.utf8String }.runWith(Sink.seq),
              5.seconds
            )
            body.mkString mustBe """[{"t":"2026-01-15T09:00:00.000Z"},{"t":"x"}]"""
          case other => fail(s"unexpected body $other")
      finally Await.result(system.terminate(), 5.seconds)
    }
  }

  "normalise text" should {
    "rewrite whole timestamp strings in a JSON fragment" in {
      IopTimestamps.normaliseText(
        """{"a":"2026-01-15T09:00:00Z","b":"2026-01-15T09:00:00.123456Z"},{"c":1}"""
      ) mustBe """{"a":"2026-01-15T09:00:00.000Z","b":"2026-01-15T09:00:00.123Z"},{"c":1}"""
    }
    "leave timestamps inside longer strings alone" in {
      val text = """{"a":"at \"2026-01-15T09:00:00Z\" ok","b":"x 2026-01-15T09:00:00Z"}"""
      IopTimestamps.normaliseText(text) mustBe text
    }
  }
