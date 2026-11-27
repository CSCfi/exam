// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package models.facility

import play.i18n.Lang

trait RoomLike:
  def roomInstruction: String
  def roomInstructionEN: String
  def roomInstructionSV: String

  def getRoomInstructions(lang: Lang): String =
    lang.code() match
      case "sv" => Option(roomInstructionSV).getOrElse(roomInstruction)
      case "en" => Option(roomInstructionEN).getOrElse(roomInstruction)
      case _    => roomInstruction
