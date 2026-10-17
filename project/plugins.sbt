// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

addSbtPlugin("org.playframework" % "sbt-plugin" % "3.0.10")

addSbtPlugin("org.playframework" % "sbt-play-ebean" % "8.5.0")

addDependencyTreePlugin

addSbtPlugin("org.scalameta" % "sbt-scalafmt" % "2.4.6")

addSbtPlugin("ch.epfl.scala" % "sbt-scalafix" % "0.12.1")
