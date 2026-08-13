// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package database

import io.ebean.{DB, Transaction}

/** Helper for managing Ebean transactions in Scala
  */
object EbeanTransactions:

  /** Execute a block within a transaction with access to transaction, handling Either results
    *
    * The block is responsible for calling commit/rollback. This helper ensures tx.end() is always
    * called.
    *
    * @param block
    *   function that takes the transaction and returns Either[E, T]
    * @tparam E
    *   the error type
    * @tparam T
    *   the success type
    * @return
    *   the Either result
    *
    * @example
    *   {{{
    * withTransaction { tx =>
    *   val user = findUser()
    *   if user == null then
    *     tx.rollback()
    *     Left("User not found")
    *   else
    *     tx.commit()
    *     Right(user)
    * }
    *   }}}
    */
  def withTransaction[E, T](block: Transaction => Either[E, T]): Either[E, T] =
    val tx     = DB.beginTransaction()
    val result = block(tx)
    tx.end()
    result
