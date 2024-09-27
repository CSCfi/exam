// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import java.io.File
import java.net.InetSocketAddress

import play.sbt.PlayRunHook

import scala.sys.process._

object WebpackServer {
  def apply(base: File): PlayRunHook = {

    object WebpackServerScript extends PlayRunHook {

      var process: Option[Process] = None // This is really ugly, how can I do this functionally?

      override def afterStarted(): Unit = {
        process = Some(Process("npm start", base).run())
        sys.addShutdownHook(shutdown())
      }

      override def afterStopped(): Unit = shutdown()

      private def shutdown(): Unit = {
        println("Shutdown webpack server...")
        process.foreach(p => {
          p.destroy()
        })
        process = None
      }
    }

    WebpackServerScript
  }
}
