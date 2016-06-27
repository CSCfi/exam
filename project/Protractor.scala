import java.net.InetSocketAddress

import play.sbt.{Play, PlayRunHook}
import sbt._

object Protractor {
    def apply(base: File): PlayRunHook = {

        object ProtractorProcess extends PlayRunHook {

            var protractor: Option[Process] = None

            override def afterStarted(address: InetSocketAddress): Unit = {
                println("Starting protractor tests...")
                protractor = Some(Process("./node_modules/protractor/bin/protractor protractor/conf.js", base).run())
                if (protractor.get.exitValue() != 0) {
                    sys.error("Protractor tests failed!")
                }
                println("Stopping protractor tests...")
                protractor.foreach(p => p.destroy())
                protractor = None
                System.exit(0)
            }

            override def afterStopped(): Unit = {
                println("Protractor stopped")
            }
        }

        ProtractorProcess
    }
}