// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package security.scala

import com.google.inject.ImplementedBy
import org.apache.pekko.actor.ActorSystem
import play.api.libs.concurrent.CustomExecutionContext

import javax.inject.Inject
import scala.concurrent.ExecutionContext

@ImplementedBy(classOf[AuthExecutionContextImpl])
trait AuthExecutionContext extends ExecutionContext

class AuthExecutionContextImpl @Inject() (system: ActorSystem)
    extends CustomExecutionContext(system, "database.dispatcher")
    with AuthExecutionContext
