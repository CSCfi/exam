package controllers;

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
