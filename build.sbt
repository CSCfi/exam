// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

name := "exam"

version := "6.4.0"

licenses += "EUPL 1.2" -> url("https://joinup.ec.europa.eu/software/page/eupl/licence-eupl")

scalaVersion := "3.7.3"

scalacOptions ++= Seq("-deprecation", "-feature", "-Dunused:imports")

lazy val root = (project in file(".")).enablePlugins(PlayJava, PlayEbean)

libraryDependencies ++= Seq(javaJdbc, ws, evolutions, filters, guice, caffeine)

libraryDependencies += "be.objectify"            %% "deadbolt-java"      % "3.0.0"
libraryDependencies += "com.google.code.gson"     % "gson"               % "2.13.2"
libraryDependencies += "com.opencsv"              % "opencsv"            % "5.12.0"
libraryDependencies += "io.vavr"                  % "vavr"               % "0.10.7"
libraryDependencies += "net.sf.biweekly"          % "biweekly"           % "0.6.8"
libraryDependencies += "org.apache.commons"       % "commons-compress"   % "1.28.0"
libraryDependencies += "org.apache.commons"       % "commons-email"      % "1.6.0"
libraryDependencies += "org.apache.poi"           % "poi"                % "5.4.1"
libraryDependencies += "org.apache.poi"           % "poi-ooxml"          % "5.4.1"
libraryDependencies += "org.cryptonode.jncryptor" % "jncryptor"          % "1.2.0"
libraryDependencies += "org.typelevel"           %% "cats-core"          % "2.13.0"
libraryDependencies += "joda-time"                % "joda-time"          % "2.14.0"
libraryDependencies += "org.jsoup"                % "jsoup"              % "1.21.2"
libraryDependencies += "org.postgresql"           % "postgresql"         % "42.7.8"
libraryDependencies += "com.nimbusds"             % "nimbus-jose-jwt"    % "10.5"
libraryDependencies += "com.icegreen"             % "greenmail"          % "2.1.7"  % "test"
libraryDependencies += "com.icegreen"             % "greenmail-junit4"   % "2.1.7"  % "test"
libraryDependencies += "com.jayway.jsonpath"      % "json-path"          % "2.9.0"  % "test"
libraryDependencies += "net.jodah"                % "concurrentunit"     % "0.4.6"  % "test"
libraryDependencies += "org.eclipse.jetty"        % "jetty-server"       % "12.1.2" % "test"
libraryDependencies += "org.eclipse.jetty.ee10"   % "jetty-ee10-servlet" % "12.1.2" % "test"
libraryDependencies += "org.easytesting"          % "fest-assert"        % "1.4"    % "test"
libraryDependencies += "org.yaml"                 % "snakeyaml"          % "2.5"    % "test"

dependencyOverrides ++= Seq(
  "com.fasterxml.jackson.core"    % "jackson-databind"     % "2.20.0",
  "com.fasterxml.jackson.core"    % "jackson-core"         % "2.20.0",
  "com.fasterxml.jackson.core"    % "jackson-annotations"  % "2.20",
  "com.fasterxml.jackson.module" %% "jackson-module-scala" % "2.20.0"
)

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation", "-proc:full")

routesImport += "system.Binders._"

routesGenerator := InjectedRoutesGenerator

Test / testOptions += Tests.Argument(TestFrameworks.JUnit, "-a", "-v")

Test / javaOptions += "-Dconfig.resource=integrationtest.conf"

Compile / doc / sources                := Seq.empty
Compile / packageDoc / publishArtifact := false

inThisBuild(
  List(
    scalaVersion      := scalaVersion.value,
    semanticdbEnabled := true
  )
)
