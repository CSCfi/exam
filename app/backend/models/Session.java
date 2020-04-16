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

package backend.models;

import org.joda.time.DateTime;

public class Session {
    private Long userId;
    private DateTime since;
    private String loginRole;
    private String email;
    private boolean temporalStudent;
    private String ongoingExamHash;
    private String upcomingExamHash;
    private String wrongRoomData;
    private String wrongMachineData;

    public Long getUserId() {
        return userId;
    }

    public void setUserId(Long userId) {
        this.userId = userId;
    }

    public DateTime getSince() {
        return since;
    }

    public void setSince(DateTime since) {
        this.since = since;
    }

    public String getLoginRole() {
        return loginRole;
    }

    public void setLoginRole(String loginRole) {
        this.loginRole = loginRole;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean isTemporalStudent() {
        return temporalStudent;
    }

    public void setTemporalStudent(boolean temporalStudent) {
        this.temporalStudent = temporalStudent;
    }

    public String getOngoingExamHash() {
        return ongoingExamHash;
    }

    public void setOngoingExamHash(String ongoingExamHash) {
        this.ongoingExamHash = ongoingExamHash;
    }

    public String getUpcomingExamHash() {
        return upcomingExamHash;
    }

    public void setUpcomingExamHash(String upcomingExamHash) {
        this.upcomingExamHash = upcomingExamHash;
    }

    public String getWrongRoomData() {
        return wrongRoomData;
    }

    public void setWrongRoomData(String wrongRoomData) {
        this.wrongRoomData = wrongRoomData;
    }

    public String getWrongMachineData() {
        return wrongMachineData;
    }

    public void setWrongMachineData(String wrongMachineData) {
        this.wrongMachineData = wrongMachineData;
    }
}
