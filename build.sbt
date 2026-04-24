// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

name                   := "exam"
version                := "6.4.0"
licenses += "EUPL 1.2" -> url("https://joinup.ec.europa.eu/software/page/eupl/licence-eupl")
scalaVersion           := "3.8.3"
scalacOptions ++= Seq(
  "-deprecation",
  "-feature",
  "-Wunused:imports",
  "-Wconf:src=routes/.*:silent"
)

lazy val root = (project in file(".")).enablePlugins(PlayScala, PlayEbean)

libraryDependencies ++= Seq(
  javaJdbc,
  ws,
  evolutions,
  filters,
  guice,
  caffeine,
  "com.google.code.gson"     % "gson"               % "2.13.2",
  "com.opencsv"              % "opencsv"            % "5.12.0",
  "net.sf.biweekly"          % "biweekly"           % "0.6.8",
  "org.apache.commons"       % "commons-compress"   % "1.28.0",
  "org.apache.commons"       % "commons-email"      % "1.6.0",
  "org.apache.poi"           % "poi"                % "5.5.1",
  "org.apache.poi"           % "poi-ooxml"          % "5.5.1",
  "org.cryptonode.jncryptor" % "jncryptor"          % "1.2.0",
  "org.typelevel"           %% "cats-core"          % "2.13.0",
  "org.typelevel"           %% "cats-effect"        % "3.7.0",
  "joda-time"                % "joda-time"          % "2.14.1",
  "org.jsoup"                % "jsoup"              % "1.22.1",
  "org.postgresql"           % "postgresql"         % "42.7.10",
  "com.icegreen"             % "greenmail"          % "2.1.8"  % Test,
  "com.icegreen"             % "greenmail-junit4"   % "2.1.8"  % Test,
  "org.eclipse.jetty"        % "jetty-server"       % "12.1.7" % Test,
  "org.eclipse.jetty.ee10"   % "jetty-ee10-servlet" % "12.1.7" % Test,
  "org.yaml"                 % "snakeyaml"          % "2.6"    % Test,
  "org.scalatest"           %% "scalatest"          % "3.2.19" % Test,
  "org.scalatestplus.play"  %% "scalatestplus-play" % "7.0.2"  % Test
)

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation", "-proc:full")
Test / testOptions += Tests.Argument(TestFrameworks.ScalaTest, "-oD")
routesGenerator                        := InjectedRoutesGenerator
PlayKeys.fileWatchService              := play.dev.filewatch.FileWatchService.polling(500)
Compile / doc / sources                := Seq.empty
Compile / packageDoc / publishArtifact := false

inThisBuild(
  List(
    scalaVersion      := scalaVersion.value,
    semanticdbEnabled := true
  )
)
