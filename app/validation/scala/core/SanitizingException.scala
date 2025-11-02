// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

/** Exception thrown when sanitization/validation fails. Used to signal that request data does not meet validation
  * requirements.
  */
class SanitizingException(message: String, cause: Throwable = null) extends Exception(message, cause):

  def this(message: String) = this(message, null)

  // Java interop
  override def getMessage: String = message
