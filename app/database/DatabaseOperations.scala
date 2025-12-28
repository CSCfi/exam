// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import security.BlockingIOExecutionContext

import scala.concurrent.Future

/** Helper for wrapping blocking database operations in Futures
  *
  * Ensures all blocking I/O operations run on the database dispatcher thread pool.
  */
object DatabaseOperations:

  /** Execute a blocking database operation on the database dispatcher
    *
    * @param block
    *   the blocking database operation to execute
    * @param ec
    *   the blocking I/O execution context (implicit)
    * @tparam T
    *   the return type
    * @return
    *   a Future that will complete with the result of the blocking operation
    *
    * @example
    *   {{{
    * import database.DatabaseOperations.blocking
    *
    * def getUser(id: Long): Future[Option[User]] =
    *   blocking {
    *     DB.find(classOf[User]).where().idEq(id).find
    *   }
    *   }}}
    */
  def blocking[T](block: => T)(using ec: BlockingIOExecutionContext): Future[T] =
    Future(block)(using ec)
