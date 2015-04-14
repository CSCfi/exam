import play.PlayImport.PlayKeys._

name := "exam"

version := "1.2.1"

lazy val `exam` = (project in file(".")).enablePlugins(PlayScala)

scalaVersion := "2.11.1"

resolvers += Resolver.url("Objectify Play Repository", url("http://deadbolt.ws/releases/"))(Resolver.ivyStylePatterns)

libraryDependencies ++= Seq(javaJdbc, javaEbean, cache , javaWs,
  "org.postgresql" % "postgresql" % "9.3-1100-jdbc4",
  "com.typesafe.play" %% "play-mailer" % "2.4.0",
  "org.avaje.ebeanorm" % "avaje-ebeanorm" % "3.3.3",
  "com.typesafe.play" % "play-ebean-33-compat" % "1.0.0",
  "be.objectify" %% "deadbolt-java" % "2.3.1",
  "org.apache.poi" % "poi" % "3.11",
  "org.apache.poi" % "poi-ooxml" % "3.11",
  "net.sf.opencsv" % "opencsv" % "2.3",
  "com.google.code.gson" % "gson" % "2.2.4" % "test",
  "com.jayway.jsonpath" % "json-path" % "1.2.0" % "test",
  "com.icegreen" % "greenmail" % "1.4.0" % "test"
)

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation")

scalacOptions ++= Seq("-feature")

routesImport += "util.scala.Binders._"

