// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
// SPDX-FileCopyrightText: 2024. The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

package controllers.facility;

import play.i18n.Lang;

public interface RoomLike {
    String getRoomInstruction();

    String getRoomInstructionEN();

    String getRoomInstructionSV();

    default String getRoomInstructions(Lang lang) {
        return switch (lang.code()) {
            case "sv" -> {
                String instructions = getRoomInstructionSV();
                yield instructions == null ? getRoomInstruction() : instructions;
            }
            case "en" -> {
                String instructions = getRoomInstructionEN();
                yield instructions == null ? getRoomInstruction() : instructions;
            }
            default -> getRoomInstruction();
        };
    }
}
