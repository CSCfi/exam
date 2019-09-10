/*
 * Copyright (c) 2018 The members of the EXAM Consortium (https://confluence.csc.fi/display/EXAM/Konsortio-organisaatio)
 *
 * Licensed under the EUPL, Version 1.1 or - as soon they will be approved by the European Commission - subsequent
 * versions of the EUPL (the "Licence");
 * You may not use this work except in compliance with the Licence.
 * You may obtain a copy of the Licence at:
 *
 * https://joinup.ec.europa.eu/software/page/eupl/licence-eupl
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the Licence is distributed
 * on an "AS IS" basis, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the Licence for the specific language governing permissions and limitations under the Licence.
 */

package backend.models.iop;

import javax.persistence.CascadeType;
import javax.persistence.Entity;
import javax.persistence.OneToOne;

import backend.controllers.RoomLike;
import backend.models.MailAddress;
import backend.models.base.GeneratedIdentityModel;


@Entity
public class ExternalReservation extends GeneratedIdentityModel implements RoomLike {

    private String orgRef;

    private String orgName;

    private String orgCode;

    private String roomRef;

    @OneToOne(cascade = CascadeType.ALL)
    private MailAddress mailAddress;

    private String buildingName;

    private String campus;

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

    public String getOrgName() {
        return orgName;
    }

    public void setOrgName(String orgName) {
        this.orgName = orgName;
    }

    public String getOrgCode() {
        return orgCode;
    }

    public void setOrgCode(String orgCode) {
        this.orgCode = orgCode;
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

    public MailAddress getMailAddress() {
        return mailAddress;
    }

    public void setMailAddress(MailAddress mailAddress) {
        this.mailAddress = mailAddress;
    }

    public String getBuildingName() {
        return buildingName;
    }

    public void setBuildingName(String buildingName) {
        this.buildingName = buildingName;
    }

    public String getCampus() {
        return campus;
    }

    public void setCampus(String campus) {
        this.campus = campus;
    }

    @Override
    public String getRoomInstruction() {
        return roomInstruction;
    }

    public void setRoomInstruction(String roomInstruction) {
        this.roomInstruction = roomInstruction;
    }

    @Override
    public String getRoomInstructionEN() {
        return roomInstructionEN;
    }

    public void setRoomInstructionEN(String roomInstructionEN) {
        this.roomInstructionEN = roomInstructionEN;
    }

    @Override
    public String getRoomInstructionSV() {
        return roomInstructionSV;
    }

    public void setRoomInstructionSV(String roomInstructionSV) {
        this.roomInstructionSV = roomInstructionSV;
    }

}
