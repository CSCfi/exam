// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package helpers

import jakarta.servlet.http.HttpServlet

import java.util.concurrent.Semaphore
import scala.compiletime.uninitialized

class BaseServlet extends HttpServlet:

  protected var waiter: Semaphore = uninitialized

  def getLastCallMethod: String =
    val call = BaseServlet.calledMethod
    BaseServlet.calledMethod = null
    call

  def setWaiter(waiter: Semaphore): Unit = this.waiter = waiter
  def getWaiter: Semaphore               = waiter

object BaseServlet:
  var calledMethod: String = uninitialized
