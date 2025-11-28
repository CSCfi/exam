// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package miscellaneous.scala

import io.ebean.{DB, Transaction}

import scala.util.Try

/** Helper for managing Ebean transactions in Scala
  *
  * Provides functional-style transaction management with automatic rollback on exceptions.
  */
object TransactionHelper:

  /** Execute a block of code within a transaction
    *
    * Automatically commits if the block succeeds, rolls back if it throws an exception.
    *
    * @param block
    *   the code to execute within the transaction
    * @tparam T
    *   the return type
    * @return
    *   the result of the block, or throws the exception if rollback occurred
    *
    * @example
    *   {{{
    * withTransaction {
    *   val user = new User()
    *   user.save()
    *   val profile = new Profile()
    *   profile.setUser(user)
    *   profile.save()
    *   user  // Return value
    * }
    *   }}}
    */
  def withTransaction[T](block: => T): T =
    val tx = DB.beginTransaction()
    try
      val result = block
      tx.commit()
      result
    finally tx.end()

  /** Execute a block of code within a transaction with access to the transaction object
    *
    * @param block
    *   function that takes the transaction and returns a result
    * @tparam T
    *   the return type
    * @return
    *   the result of the block
    *
    * @example
    *   {{{
    * withTransactionAccess { tx =>
    *   val user = new User()
    *   user.save()
    *   tx.setBatchMode(true)
    *   users.foreach(_.save())
    *   user
    * }
    *   }}}
    */
  def withTransactionAccess[T](block: Transaction => T): T =
    val tx = DB.beginTransaction()
    try
      val result = block(tx)
      tx.commit()
      result
    finally tx.end()

  /** Execute a block within a transaction, returning Try for error handling
    *
    * @param block
    *   the code to execute
    * @tparam T
    *   the return type
    * @return
    *   Success with result, or Failure with exception
    *
    * @example
    *   {{{
    * tryWithTransaction {
    *   user.save()
    *   profile.save()
    * } match {
    *   case Success(_) => Ok("Saved")
    *   case Failure(e) => InternalServerError(e.getMessage)
    * }
    *   }}}
    */
  def tryWithTransaction[T](block: => T): Try[T] =
    Try {
      withTransaction(block)
    }

  /** Execute a block within a transaction with pessimistic lock on an entity
    *
    * Useful for preventing race conditions when multiple requests might modify the same entity.
    *
    * @param entityClass
    *   the class of the entity to lock
    * @param id
    *   the ID of the entity to lock
    * @param block
    *   the code to execute after locking
    * @tparam E
    *   the entity type
    * @tparam T
    *   the return type
    * @return
    *   the result of the block
    *
    * @example
    *   {{{
    * withLock(classOf[User], userId) {
    *   val enrolment = new ExamEnrolment()
    *   enrolment.setUser(DB.find(classOf[User], userId))
    *   enrolment.save()
    * }
    *   }}}
    */
  def withLock[E, T](entityClass: Class[E], id: Any)(block: => T): T =
    withTransaction {
      // Take pessimistic lock
      DB.find(entityClass).forUpdate().where().idEq(id).findOne()
      block
    }
