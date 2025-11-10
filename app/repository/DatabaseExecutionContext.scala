// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package repository

import org.apache.pekko.actor.ActorSystem
import play.api.libs.concurrent.CustomExecutionContext

import java.util.concurrent.Executor
import javax.inject.Inject
import scala.concurrent.ExecutionContext

class DatabaseExecutionContext @Inject() (actorSystem: ActorSystem)
    extends CustomExecutionContext(actorSystem, "database.dispatcher")
    with ExecutionContext:

  // Java interop: returns this as Executor (for use with CompletableFuture.supplyAsync)
  def current(): Executor = this

