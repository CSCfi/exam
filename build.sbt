name := "exam"

version := "2.1.0"

lazy val `exam` = (project in file(".")).enablePlugins(PlayScala, PlayEbean)

scalaVersion := "2.11.6"

libraryDependencies ++= Seq(javaJdbc, cache , javaWs, evolutions,
  "org.postgresql" % "postgresql" % "9.3-1100-jdbc4",
  "be.objectify" %% "deadbolt-java" % "2.4.0",
  "com.typesafe.play" %% "play-mailer" % "3.0.1",
  "org.apache.poi" % "poi" % "3.11",
  "org.apache.poi" % "poi-ooxml" % "3.11",
  "org.apache.commons" % "commons-compress" % "1.9",
  "net.sf.opencsv" % "opencsv" % "2.3",
  "org.jsoup" % "jsoup" % "1.8.3",
  "com.google.code.gson" % "gson" % "2.3" % "test",
  "com.jayway.jsonpath" % "json-path" % "1.2.0" % "test",
  "com.icegreen" % "greenmail" % "1.4.0" % "test",
  "org.eclipse.jetty" % "jetty-server" % "9.2.10.v20150310" % "test",
  "org.eclipse.jetty" % "jetty-servlet" % "9.2.10.v20150310" % "test",
  "org.easytesting" % "fest-assert" % "1.4" % "test"
)

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

scalacOptions ++= Seq("-feature")

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

