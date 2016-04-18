name := "exam"

version := "3.1.7"

lazy val `exam` = (project in file(".")).enablePlugins(PlayScala, PlayEbean)

scalaVersion := "2.11.7"

libraryDependencies ++= Seq(javaJdbc, cache , javaWs, evolutions, filters,
  "org.postgresql" % "postgresql" % "9.4-1204-jdbc4",
  "be.objectify" %% "deadbolt-java" % "2.4.3",
  "com.typesafe.play" %% "play-mailer" % "3.0.1",
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

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

scalacOptions ++= Seq("-feature")

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

