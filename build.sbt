name := "exam"

version := "3.2.3"

lazy val `exam` = (project in file(".")).enablePlugins(PlayJava, PlayEbean)

scalaVersion := "2.11.8"

libraryDependencies ++= Seq(javaJdbc, cache , javaWs, evolutions, filters,
  "org.postgresql" % "postgresql" % "9.4-1204-jdbc4",
  "be.objectify" %% "deadbolt-java" % "2.5.0",
  "org.apache.commons" % "commons-email" % "1.4",
  "org.apache.poi" % "poi" % "3.13",
  "org.apache.poi" % "poi-ooxml" % "3.13",
  "org.apache.commons" % "commons-compress" % "1.10",
  "net.sf.opencsv" % "opencsv" % "2.3",
  "org.jsoup" % "jsoup" % "1.8.3",
  "net.sf.biweekly" % "biweekly" % "0.4.3",
  "com.google.code.gson" % "gson" % "2.4" % "test",
  "com.jayway.jsonpath" % "json-path" % "2.0.0" % "test",
  "com.icegreen" % "greenmail" % "1.4.1" % "test",
  "org.eclipse.jetty" % "jetty-server" % "9.2.13.v20150730" % "test",
  "org.eclipse.jetty" % "jetty-servlet" % "9.2.13.v20150730" % "test",
  "org.easytesting" % "fest-assert" % "1.4" % "test"
)

libraryDependencies ++= Seq(
  "org.webjars" %% "webjars-play" % "2.5.0",
  "org.webjars.bower" % "angular" % "1.4.7",
  "org.webjars.bower" % "angular-animate" % "1.4.7",
  "org.webjars.bower" % "angular-cookies" % "1.4.7",
  "org.webjars.bower" % "angular-i18n" % "1.4.7",
  "org.webjars.bower" % "angular-resource" % "1.4.7",
  "org.webjars.bower" % "angular-route" % "1.4.7",
  "org.webjars.bower" % "angular-sanitize" % "1.4.7",
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
  "org.webjars.bower" % "angular-dynamic-locale" % "0.1.30",
  "org.webjars.bower" % "font-awesome" % "4.6.1",
  "org.webjars.bower" % "fullcalendar" % "2.4.0",
  "org.webjars.bower" % "jquery" % "2.1.4",
  "org.webjars" % "jquery-ui" % "1.11.4",
  "org.webjars" % "jquery-ui-touch-punch" % "0.2.3-2",
  "org.webjars" % "toastr" % "2.1.1",
  "org.webjars" % "angular-ui-bootstrap" % "0.14.3",
  "org.webjars" % "ui-select2" % "0.0.5-1"
)

dependencyOverrides += "org.webjars.bower" % "angular" % "1.4.7"

dependencyOverrides += "org.webjars.bower" % "jquery" % "2.1.4"

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

// PlayKeys.playRunHooks += Karma(baseDirectory.value)
