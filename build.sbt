import play.sbt.PlayRunHook

import scala.util.Properties

name := "exam"

version := "4.0.0"

licenses += "EUPL 1.1" -> url("http://joinup.ec.europa.eu/software/page/eupl/licence-eupl")

lazy val `exam` = (project in file(".")).enablePlugins(PlayJava, PlayEbean)

scalaVersion := "2.11.11"

libraryDependencies ++= Seq(javaJdbc, ehcache, ws, evolutions, filters, guice,
  "org.postgresql" % "postgresql" % "42.1.4",
  "be.objectify" %% "deadbolt-java" % "2.6.0",
  "org.apache.commons" % "commons-email" % "1.5",
  "org.apache.poi" % "poi" % "3.17",
  "org.apache.poi" % "poi-ooxml" % "3.17",
  "org.apache.commons" % "commons-compress" % "1.14",
  "com.opencsv" % "opencsv" % "4.0",
  "org.jsoup" % "jsoup" % "1.10.3",
  "net.sf.biweekly" % "biweekly" % "0.6.1",
  "com.google.code.gson" % "gson" % "2.8.2",
  "com.github.fge" % "json-schema-validator" % "2.2.6",
  "com.jayway.jsonpath" % "json-path" % "2.2.0" % "test",
  "com.icegreen" % "greenmail" % "1.5.5" % "test",
  "org.eclipse.jetty" % "jetty-server" % "9.4.4.v20170414" % "test",
  "org.eclipse.jetty" % "jetty-servlet" % "9.4.4.v20170414" % "test",
  "org.easytesting" % "fest-assert" % "1.4" % "test",
  "org.yaml" % "snakeyaml" % "1.17" % "test",
  "net.jodah" % "concurrentunit" % "0.4.2" % "test"
)

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

routesImport += "backend.util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

sources in(Compile, doc) := Seq.empty
publishArtifact in(Compile, packageDoc) := false

lazy val frontendDirectory = baseDirectory {
  _ / "app/frontend"
}

/**
  * Webpack dev server task
  */
def withoutWebpackServer = Properties.propOrEmpty("withoutWebpackServer")

def webpackTask = Def.taskDyn[PlayRunHook] {
  if (withoutWebpackServer.equals("true"))
    Def.task {
      NoOp()
    }
  else {
    val webpackBuild = taskKey[Unit]("Webpack build task.")

    webpackBuild := {
      Process("npm run build", frontendDirectory.value).run
    }

    (packageBin in Universal) := ((packageBin in Universal) dependsOn webpackBuild).value

    Def.task {
      frontendDirectory.map(WebpackServer(_)).value
    }
  }
}

PlayKeys.playRunHooks += webpackTask.value


/**
  * Karma test task.
  */

def skipUiTests = Properties.propOrEmpty("skipUiTests")

def protractorConf = Properties.propOrEmpty("config.resource")

lazy val npmIntall = taskKey[Option[Process]]("Npm intall task")
npmIntall := {
  Some(Process("npm install", frontendDirectory.value).run())
}

lazy val karmaTest = taskKey[Option[Process]]("Karma test task")
karmaTest := {
  Some(Process("node_modules/karma/bin/karma start ./test/karma.conf.ci.js", frontendDirectory.value).run())
}

lazy val webDriverUpdate = taskKey[Option[Process]]("Web driver update task")
webDriverUpdate := {
  Some(Process("node_modules/protractor/bin/webdriver-manager update", frontendDirectory.value).run())
}

test in Test := {
  if (karmaTest.value.get.exitValue() != 0 || npmIntall.value.get.exitValue() != 0)
    sys.error("Karma tests failed!")
  (test in Test).value
}

def uiTestTask = Def.taskDyn[Seq[PlayRunHook]] {
  if (!skipUiTests.equals("true") && npmIntall.value.get.exitValue() == 0) {
    Def.task {
      Seq(MockCourseInfo(frontendDirectory.value),
        if (protractorConf.equals("protractor.conf") && webDriverUpdate.value.get.exitValue() == 0)
          Protractor(baseDirectory.value,
            Properties.propOrElse("protractor.config", "conf.js"),
            Properties.propOrElse("protractor.args", " "))
        else {
          Karma(frontendDirectory.value)
        })
    }
  } else {
    Def.task {
      Seq(NoOp())
    }
  }
}

PlayKeys.playRunHooks ++= uiTestTask.value
