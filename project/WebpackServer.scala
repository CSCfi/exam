import java.io.File
import java.net.InetSocketAddress

import play.sbt.PlayRunHook
import sbt._

object WebpackServer {
  def apply(base: File): PlayRunHook = {

    object WebpackServerScript extends PlayRunHook {

      var process: Option[Process] = None // This is really ugly, how can I do this functionally?

      override def afterStarted(addr: InetSocketAddress): Unit = {
        process = Option(Process("npm start", base).run)
      }

      override def afterStopped(): Unit = {
        process.foreach(p => { p.destroy() })
        process = None
      }
    }

    WebpackServerScript
  }
}
