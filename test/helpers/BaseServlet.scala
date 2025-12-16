// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import jakarta.servlet.http.HttpServlet
import net.jodah.concurrentunit.Waiter

import scala.compiletime.uninitialized

class BaseServlet extends HttpServlet:

  protected var waiter: Waiter = uninitialized

  def getLastCallMethod: String =
    val call = BaseServlet.calledMethod
    BaseServlet.calledMethod = null
    call

  def setWaiter(waiter: Waiter): Unit = this.waiter = waiter
  def getWaiter: Waiter               = waiter

object BaseServlet:
  var calledMethod: String = uninitialized
