import play.sbt.PlayRunHook

import scala.sys.process.Process
import scala.util.Properties

name := "exam"

version := "4.1.0-RC7"

licenses += "EUPL 1.1" -> url("http://joinup.ec.europa.eu/software/page/eupl/licence-eupl")

scalaVersion := "2.12.6"

lazy val root = (project in file(".")).enablePlugins(PlayJava, PlayEbean)

libraryDependencies += javaJdbc
libraryDependencies += ehcache
libraryDependencies += ws
libraryDependencies += evolutions
libraryDependencies += filters
libraryDependencies += guice

libraryDependencies += "be.objectify" %% "deadbolt-java" % "2.6.3"
libraryDependencies += "com.github.fge" % "json-schema-validator" % "2.2.6" exclude("javax.mail", "mailapi")
libraryDependencies += "com.google.code.gson" % "gson" % "2.8.2"
libraryDependencies += "com.opencsv" % "opencsv" % "4.0"
libraryDependencies += "net.sf.biweekly" % "biweekly" % "0.6.1"
libraryDependencies += "org.apache.commons" % "commons-compress" % "1.14"
libraryDependencies += "org.apache.commons" % "commons-email" % "1.5"
libraryDependencies += "org.apache.poi" % "poi" % "3.17"
libraryDependencies += "org.apache.poi" % "poi-ooxml" % "3.17"
libraryDependencies += "org.jsoup" % "jsoup" % "1.10.3"
libraryDependencies += "org.postgresql" % "postgresql" % "42.1.4"
libraryDependencies += "com.icegreen" % "greenmail" % "1.5.7" % "test"
libraryDependencies += "com.jayway.jsonpath" % "json-path" % "2.2.0" % "test"
libraryDependencies += "net.jodah" % "concurrentunit" % "0.4.2" % "test"
libraryDependencies += "org.eclipse.jetty" % "jetty-server" % "9.4.4.v20170414" % "test"
libraryDependencies += "org.eclipse.jetty" % "jetty-servlet" % "9.4.4.v20170414" % "test"
libraryDependencies += "org.easytesting" % "fest-assert" % "1.4" % "test"
libraryDependencies += "org.yaml" % "snakeyaml" % "1.17" % "test"


javacOptions += "-Xlint:unchecked"
javacOptions += "-Xlint:deprecation"

routesImport += "backend.util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

testOptions in Test += Tests.Argument(TestFrameworks.JUnit, "-a", "-v")

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

lazy val npmInstall = taskKey[Option[Process]]("Npm intall task")
npmInstall := {
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
  if (karmaTest.value.get.exitValue() != 0 || npmInstall.value.get.exitValue() != 0)
    sys.error("Karma tests failed!")
  (test in Test).value
}

def uiTestTask = Def.taskDyn[Seq[PlayRunHook]] {
  if (!skipUiTests.equals("true") && npmInstall.value.get.exitValue() == 0) {
    def bdval = baseDirectory.value
    def fdval = frontendDirectory.value

    Def.task {
      Seq(MockCourseInfo(fdval),
        if (protractorConf.equals("protractor.conf") && webDriverUpdate.value.get.exitValue() == 0)
          Protractor(bdval,
            Properties.propOrElse("protractor.config", "conf.js"),
            Properties.propOrElse("protractor.args", " "))
        else {
          Karma(fdval)
        })
    }
  } else {
    Def.task {
      Seq(NoOp())
    }
  }
}

PlayKeys.playRunHooks ++= uiTestTask.value

