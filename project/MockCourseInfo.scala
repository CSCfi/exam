import java.net.InetSocketAddress

import play.sbt.PlayRunHook
import sbt._

object MockCourseInfo {
    def apply(base: File): PlayRunHook = {

        object MockCourseInfoProcess extends PlayRunHook {

            var mockCourseInfo: Option[Process] = None

            override def afterStarted(address: InetSocketAddress): Unit = {
                println("MockCourseInfo server running...")
                mockCourseInfo = Some(Process("./node_modules/http-server/bin/http-server ./protractor/mock_courses -p 34110 -a localhost -e json", base).run())
            }

            override def afterStopped(): Unit = {
                println("MockCourseInfo stopping...")
                mockCourseInfo.foreach(p => p.destroy())
                mockCourseInfo = None
            }
        }

        MockCourseInfoProcess
    }
}