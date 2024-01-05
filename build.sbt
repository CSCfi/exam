name := "exam"

version := "6.2.0"

licenses += "EUPL 1.1" -> url("https://joinup.ec.europa.eu/software/page/eupl/licence-eupl")

scalaVersion := "3.3.1"

scalacOptions ++= Seq("-deprecation", "-feature")

lazy val root = (project in file(".")).enablePlugins(PlayJava, PlayEbean)

libraryDependencies ++= Seq(javaJdbc, ws, evolutions, filters, guice)

libraryDependencies += "be.objectify"            %% "deadbolt-java"         % "3.0.0"
libraryDependencies += "com.networknt"            % "json-schema-validator" % "1.0.82"
libraryDependencies += "com.google.code.gson"     % "gson"                  % "2.10.1"
libraryDependencies += "com.opencsv"              % "opencsv"               % "5.7.1"
libraryDependencies += "io.vavr"                  % "vavr"                  % "0.10.4"
libraryDependencies += "net.sf.biweekly"          % "biweekly"              % "0.6.7"
libraryDependencies += "org.apache.commons"       % "commons-compress"      % "1.21"
libraryDependencies += "org.apache.commons"       % "commons-email"         % "1.5"
libraryDependencies += "org.apache.poi"           % "poi"                   % "5.2.2"
libraryDependencies += "org.apache.poi"           % "poi-ooxml"             % "5.2.2"
libraryDependencies += "org.cryptonode.jncryptor" % "jncryptor"             % "1.2.0"
libraryDependencies += "joda-time"                % "joda-time"             % "2.12.5"
libraryDependencies += "org.jsoup"                % "jsoup"                 % "1.15.4"
libraryDependencies += "org.postgresql"           % "postgresql"            % "42.5.4"
libraryDependencies += "com.icegreen"        % "greenmail"        % "2.1.0-alpha-3" % "test"
libraryDependencies += "com.icegreen"        % "greenmail-junit4" % "2.0.0"         % "test"
libraryDependencies += "com.jayway.jsonpath" % "json-path"        % "2.7.0"         % "test"
libraryDependencies += "net.jodah"           % "concurrentunit"   % "0.4.6"         % "test"
libraryDependencies += "org.eclipse.jetty"   % "jetty-server"     % "11.0.14"       % "test"
libraryDependencies += "org.eclipse.jetty"   % "jetty-servlet"    % "11.0.14"       % "test"
libraryDependencies += "org.easytesting"     % "fest-assert"      % "1.4"           % "test"
libraryDependencies += "org.yaml"            % "snakeyaml"        % "2.0"           % "test"

//dependencyOverrides += "com.sun.mail" % "javax.mail" % "1.6.2" % "test"

javacOptions ++= Seq("-Xlint:unchecked", "-Xlint:deprecation", "-proc:full")

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

Test / testOptions += Tests.Argument(TestFrameworks.JUnit, "-a", "-v")

Test / javaOptions += "-Dconfig.resource=integrationtest.conf"

Compile / doc / sources                := Seq.empty
Compile / packageDoc / publishArtifact := false
