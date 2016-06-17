import java.net.InetSocketAddress

import play.sbt.PlayRunHook
import sbt._

object Karma {
    def apply(base: File): PlayRunHook = {

        object KarmaProcess extends PlayRunHook {

            var karma: Option[Process] = None

            override def afterStarted(address: InetSocketAddress): Unit = {
                println("Karma running...")
                karma = Some(Process("./node_modules/karma/bin/karma start", base).run())
            }

            override def afterStopped(): Unit = {
                println("Karma stopping...")
                karma.foreach(p => p.destroy())
                karma = None
            }
        }

        KarmaProcess
    }
}