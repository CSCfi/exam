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

play.Project.playJavaSettings
