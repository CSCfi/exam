// Copyright (c) 2018 Exam Consortium
// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import java.net.InetSocketAddress

import play.sbt.PlayRunHook

object NoOp {
  def apply(): PlayRunHook = {

    object DummyScript extends PlayRunHook {

      override def afterStarted(): Unit = {

      }

      override def afterStopped(): Unit = {

      }
    }

    DummyScript
  }
}
