package models.iop;

import models.base.GeneratedIdentityModel;

import javax.persistence.Entity;


@Entity
public class ExternalReservation extends GeneratedIdentityModel {

    private String orgRef;

    private String roomRef;

    private String machineName;

    private String roomName;

    private String roomCode;

    private String roomTz;

    private String roomInstruction;

    private String roomInstructionEN;

    private String roomInstructionSV;

    public String getOrgRef() {
        return orgRef;
    }

    public void setOrgRef(String orgRef) {
        this.orgRef = orgRef;
    }

    public String getRoomRef() {
        return roomRef;
    }

    public void setRoomRef(String roomRef) {
        this.roomRef = roomRef;
    }

    public String getMachineName() {
        return machineName;
    }

    public void setMachineName(String machineName) {
        this.machineName = machineName;
    }

    public String getRoomName() {
        return roomName;
    }

    public void setRoomName(String roomName) {
        this.roomName = roomName;
    }

    public String getRoomCode() {
        return roomCode;
    }

    public void setRoomCode(String roomCode) {
        this.roomCode = roomCode;
    }

    public String getRoomTz() {
        return roomTz;
    }

    public void setRoomTz(String roomTz) {
        this.roomTz = roomTz;
    }

    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
    }

    public String getRoomInstructionEN() {
        return roomInstructionEN;
    }

    public void setRoomInstructionEN(String roomInstructionEN) {
        this.roomInstructionEN = roomInstructionEN;
    }

    public String getRoomInstructionSV() {
        return roomInstructionSV;
    }

    public void setRoomInstructionSV(String roomInstructionSV) {
        this.roomInstructionSV = roomInstructionSV;
    }
}
