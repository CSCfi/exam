import java.net.InetSocketAddress

import play.sbt.PlayRunHook
import sbt.File

import scala.sys.process._

object Karma {
  def apply(base: File): PlayRunHook = {

    object KarmaProcess extends PlayRunHook {

      var karma: Option[Process] = None

      override def afterStarted(): Unit = {
        println("Karma running...")
        karma = Some(Process("./node_modules/karma/bin/karma start ./test/karma.conf.js", base).run())
      }

      override def afterStopped(): Unit = shutdown()

      private def shutdown(): Unit = {
        println("Karma stopping...")
        karma.foreach(p => p.destroy())
        karma = None
      }
    }

    KarmaProcess
  }
}
