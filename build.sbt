import net.litola.SassPlugin

name := "sitnet"

version := "1.0-SNAPSHOT"


play.Project.playScalaSettings ++ SassPlugin.sassSettings

libraryDependencies ++= Seq(
  "org.postgresql" % "postgresql" % "9.3-1100-jdbc4",
  javaJdbc,
  javaEbean,
  cache
)     

resolvers += Resolver.url("Objectify Play Repository", url("http://schaloner.github.com/releases/"))(Resolver.ivyStylePatterns)

resolvers += Resolver.url("Objectify Play Snapshot Repository", url("http://schaloner.github.com/snapshots/"))(Resolver.ivyStylePatterns)

resolvers += Resolver.typesafeRepo("releases")

resolvers += Resolver.sonatypeRepo("releases")

libraryDependencies += "be.objectify" %% "deadbolt-java" % "2.2-RC4"

play.Project.playJavaSettings
