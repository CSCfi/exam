import play.sbt.PlayRunHook
import sbt.File

import scala.sys.process._


object MockCourseInfo {
  def apply(base: File): PlayRunHook = {

    object MockCourseInfoProcess extends PlayRunHook {

      var mockCourseInfo: Option[Process] = None

      override def afterStarted(): Unit = {
        println("MockCourseInfo server running...")
        mockCourseInfo = Some(Process("./node_modules/http-server/bin/http-server ./protractor/mock_courses -p 34110 -a localhost -e json", base).run())
        sys.addShutdownHook(shutdown())
      }

      override def afterStopped(): Unit = shutdown()

      private def shutdown(): Unit = {
        println("MockCourseInfo stopping...")
        mockCourseInfo.foreach(p => p.destroy())
        mockCourseInfo = None
      }
    }

    MockCourseInfoProcess
  }
}
