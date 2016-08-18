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
}
