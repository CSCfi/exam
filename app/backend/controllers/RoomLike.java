package backend.controllers;

import play.i18n.Lang;

public interface RoomLike {
    String getRoomInstruction();

    String getRoomInstructionEN();

    String getRoomInstructionSV();

    default String getRoomInstructions(Lang lang) {
        String instructions;
        switch (lang.code()) {
            case "sv":
                instructions = getRoomInstructionSV();
                return instructions == null ? getRoomInstruction() : instructions;
            case "en":
                instructions = getRoomInstructionEN();
                return instructions == null ? getRoomInstruction() : instructions;
            case "fi":
            default:
                return getRoomInstruction();
        }
    }

}
