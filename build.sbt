import scala.util.Properties

name := "exam"

version := "4.0.1"

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

// Angular version. Remember to change locale location pattern in app.js when changing this!
val ngVersion = "1.5.3"

libraryDependencies ++= Seq(
  "org.webjars" %% "webjars-play" % "2.6.2",
  "org.webjars.bower" % "angular" % ngVersion,
  "org.webjars.bower" % "angular-animate" %  ngVersion,
  "org.webjars.bower" % "angular-i18n" %  ngVersion,
  "org.webjars.bower" % "angular-resource" %  ngVersion,
  "org.webjars.bower" % "angular-route" %  ngVersion,
  "org.webjars.bower" % "angular-mocks" %  ngVersion,
  "org.webjars.bower" % "angular-sanitize" % ngVersion,
  "org.webjars.bower" % "angular-translate" % "2.11.0",
  "org.webjars.bower" % "angular-translate-loader-static-files" % "2.11.0",
  "org.webjars.bower" % "angular-ui-calendar" % "1.0.1",
  "org.webjars.bower" % "angular-ui-select" % "0.16.1",
  "org.webjars.bower" % "angular-http-auth" % "1.2.3",
  "org.webjars.bower" % "angular-dialog-service" % "5.2.8",
  "org.webjars.bower" % "bootstrap-sass" % "3.3.6",
  "org.webjars.bower" % "ngstorage" % "0.3.10",
  "org.webjars.bower" % "momentjs" % "2.10.6",
  "org.webjars.bower" % "moment-timezone" % "0.5.0",
  "org.webjars.bower" % "amitava82-angular-multiselect" % "1.0.0",
  "org.webjars.bower" % "select2" % "3.5.4",
  "org.webjars.bower" % "angular-strap" % "2.3.7",
  "org.webjars.bower" % "FileSaver.js" % "0.0.2",
  "org.webjars.bower" % "angular-dynamic-locale" % "0.1.32",
  "org.webjars.bower" % "font-awesome" % "4.6.1",
  "org.webjars.bower" % "fullcalendar" % "2.4.0",
  "org.webjars.bower" % "jquery" % "2.1.4",
  "org.webjars.bower" % "lodash" % "4.17.4",
  "org.webjars" % "jquery-ui" % "1.11.4",
  "org.webjars" % "jquery-ui-touch-punch" % "0.2.3-2",
  "org.webjars" % "toastr" % "2.1.1",
  "org.webjars" % "angular-ui-bootstrap" % "2.2.0",
  "org.webjars" % "ui-select2" % "0.0.5-1",
  "org.webjars.npm" % "async" % "2.5.0"
)

dependencyOverrides += "org.webjars.bower" % "angular" %  ngVersion

dependencyOverrides += "org.webjars.bower" % "angular-sanitize" % ngVersion

dependencyOverrides += "org.webjars.bower" % "jquery" % "2.1.4"

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

/**
 * Karma test task.
 */
lazy val karmaTest = taskKey[Int]("Karma test task")
karmaTest := {
  baseDirectory.value + "/node_modules/karma/bin/karma start karma.conf.ci.js" !
}

/**
 * Web driver update task.
 */
lazy val webDriver = taskKey[Int]("Web driver update task")
webDriver := {
  baseDirectory.value + "/node_modules/protractor/bin/webdriver-manager update" !
}

test in Test := {
  if (karmaTest.value != 0)
    sys.error("Karma tests failed!")
  (test in Test).value
}

val conf = Properties.propOrEmpty("config.resource")

PlayKeys.playRunHooks += {
  if (conf.equals("protractor.conf") && webDriver.value == 0)
    Protractor(baseDirectory.value,
      Properties.propOrElse("protractor.config", "conf.js"),
      Properties.propOrElse("protractor.args", " "))
  else
    Karma(baseDirectory.value)
}
