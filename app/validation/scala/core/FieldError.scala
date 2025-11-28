// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package validation.scala.core

case class FieldError(field: String, message: String):
  override def toString: String = s"$field: $message"
