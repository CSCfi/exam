// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

enablePlugins(GatlingPlugin)

scalaVersion := "3.6.2"

val gatlingVersion = "3.13.3"
libraryDependencies += "io.gatling.highcharts" % "gatling-charts-highcharts" % gatlingVersion % "test,it"
libraryDependencies += "io.gatling"            % "gatling-test-framework"    % gatlingVersion % "test,it"
libraryDependencies += "io.gatling"            % "gatling-jdbc"              % gatlingVersion % "test,it"
libraryDependencies += "org.postgresql"        % "postgresql"                % "42.7.3"
