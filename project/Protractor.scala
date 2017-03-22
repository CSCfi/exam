import java.net.InetSocketAddress

import play.sbt.{Play, PlayRunHook}
import sbt._

object Protractor {
    def apply(base: File, conf: String, args: String): PlayRunHook = {

        object ProtractorProcess extends PlayRunHook {

            var protractor: Option[Process] = None

            override def afterStarted(address: InetSocketAddress): Unit = {
                println("Starting protractor tests...")
                val process = Seq("./node_modules/protractor/bin/protractor", "protractor/" + conf, args.replaceAll(",", " ")).mkString(" ")
                println(process)
                protractor = Some(Process(process, base).run())
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