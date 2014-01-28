logLevel := Level.Warn

resolvers += "Typesafe repository" at "http://repo.typesafe.com/typesafe/releases/"

resolvers += "Sonatype OSS Releases" at "https://oss.sonatype.org/content/repositories/releases"

addSbtPlugin("net.litola" % "play-sass" % "0.3.0")

addSbtPlugin("com.typesafe.play" % "sbt-plugin" % "2.2.1")