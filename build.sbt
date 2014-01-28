import net.litola.SassPlugin

name := "sitnet"

version := "1.0-SNAPSHOT"


play.Project.playScalaSettings ++ SassPlugin.sassSettings

libraryDependencies ++= Seq(
  javaJdbc,
  javaEbean,
  cache
)     

play.Project.playJavaSettings


