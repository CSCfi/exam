import play.sbt.PlayRunHook
import sbt.File

import scala.sys.process._


object Protractor {
  def apply(base: File, conf: String, args: String): PlayRunHook = {

    object ProtractorProcess extends PlayRunHook {

      var protractor: Option[Process] = None

      override def afterStarted(): Unit = {
        println("Starting protractor tests...")
        val process = Seq("app/protractor/node_modules/protractor/bin/protractor", "app/protractor/" + conf, args.replaceAll(",", " ")).mkString(" ")
        println(process)
        var code = 0
        sys.addShutdownHook(shutdown())
        try {
          protractor = Some(Process(process, base).run())
          code = protractor.get.exitValue()
          if (code != 0) {
            sys.error("Protractor tests failed!")
          }
        } finally {
          sys.exit(code)
        }
      }

      override def afterStopped(): Unit = shutdown()

      private def shutdown(): Unit = {
        println("Stopping protractor tests...")
        protractor.foreach(p => p.destroy())
        protractor = None
      }
    }

    ProtractorProcess
  }
}
