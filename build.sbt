name := "exam"

version := "5.3.0"
licenses += "EUPL 1.1" -> url("http://joinup.ec.europa.eu/software/page/eupl/licence-eupl")

scalaVersion := "2.13.4"

scalacOptions ++= Seq("-deprecation", "-feature")

lazy val root = (project in file("."))
  .enablePlugins(PlayJava, PlayEbean)
  .settings(
    watchSources ++= (baseDirectory.value / "ui/src" ** "*").get
  )

libraryDependencies += javaJdbc
libraryDependencies += ws
libraryDependencies += evolutions
libraryDependencies += filters
libraryDependencies += guice

// JAXB (missing in JDK 11 and above)
libraryDependencies += "com.sun.xml.bind" % "jaxb-core"  % "2.3.0"
libraryDependencies += "com.sun.xml.bind" % "jaxb-impl"  % "2.3.0"
libraryDependencies += "javax.xml.bind"   % "jaxb-api"   % "2.3.0"
libraryDependencies += "javax.activation" % "activation" % "1.1.1"

libraryDependencies += "be.objectify"             %% "deadbolt-java"        % "2.8.1"
libraryDependencies += "com.networknt"            % "json-schema-validator" % "1.0.45"
libraryDependencies += "com.google.code.gson"     % "gson"                  % "2.8.2"
libraryDependencies += "com.opencsv"              % "opencsv"               % "4.0"
libraryDependencies += "io.vavr"                  % "vavr"                  % "0.9.3"
libraryDependencies += "net.sf.biweekly"          % "biweekly"              % "0.6.1"
libraryDependencies += "org.apache.commons"       % "commons-compress"      % "1.14"
libraryDependencies += "org.apache.commons"       % "commons-email"         % "1.5"
libraryDependencies += "org.apache.poi"           % "poi"                   % "4.1.0"
libraryDependencies += "org.apache.poi"           % "poi-ooxml"             % "4.1.0"
libraryDependencies += "org.cryptonode.jncryptor" % "jncryptor"             % "1.2.0"
libraryDependencies += "org.jsoup"                % "jsoup"                 % "1.10.3"
libraryDependencies += "org.postgresql"           % "postgresql"            % "42.2.9"
libraryDependencies += "com.icegreen"             % "greenmail"             % "1.5.7" % "test"
libraryDependencies += "com.jayway.jsonpath"      % "json-path"             % "2.2.0" % "test"
libraryDependencies += "net.jodah"                % "concurrentunit"        % "0.4.2" % "test"
libraryDependencies += "org.eclipse.jetty"        % "jetty-server"          % "9.4.4.v20170414" % "test"
libraryDependencies += "org.eclipse.jetty"        % "jetty-servlet"         % "9.4.4.v20170414" % "test"
libraryDependencies += "org.easytesting"          % "fest-assert"           % "1.4" % "test"
libraryDependencies += "org.yaml"                 % "snakeyaml"             % "1.17" % "test"

javacOptions += "-Xlint:unchecked"
javacOptions += "-Xlint:deprecation"

routesImport += "util.scala.Binders._"

routesGenerator := InjectedRoutesGenerator

testOptions in Test += Tests.Argument(TestFrameworks.JUnit, "-a", "-v")
