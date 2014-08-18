import net.litola.SassPlugin

name := "sitnet"

version := "1.0-SNAPSHOT"

play.Project.playScalaSettings ++ SassPlugin.sassSettings

libraryDependencies ++= Seq(
  "org.postgresql" % "postgresql" % "9.3-1100-jdbc4",
  javaJdbc,
  javaEbean,
  cache,
  "com.typesafe" %% "play-plugins-mailer" % "2.2.0"
)

libraryDependencies ++= Seq(
  "org.avaje.ebeanorm" % "avaje-ebeanorm" % "3.3.3",
  "com.typesafe.play" % "play-ebean-33-compat" % "1.0.0"
)

libraryDependencies ++= Seq(
  "org.apache.poi" % "poi" % "3.8",
  "org.apache.poi" % "poi-ooxml" % "3.9"
)

resolvers += Resolver.url("Objectify Play Repository", url("http://schaloner.github.com/releases/"))(Resolver.ivyStylePatterns)

resolvers += Resolver.url("Objectify Play Snapshot Repository", url("http://schaloner.github.com/snapshots/"))(Resolver.ivyStylePatterns)

resolvers += Resolver.typesafeRepo("releases")

resolvers += Resolver.sonatypeRepo("releases")

resolvers += "Typesafe repository" at "http://repo.typesafe.com/typesafe/releases/"

libraryDependencies += "be.objectify" %% "deadbolt-java" % "2.2-RC4"

play.Project.playJavaSettings

routesImport += "util.scala.Binders._"

routesImport += "controllers.CourseController.FilterType"