/*
 * Copyright (c) 2017 Exam Consortium
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
import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import type { Address, WorkingHour } from 'src/app/facility/rooms/room.service';
import type { User } from 'src/app/session/session.service';

export type DefaultWorkingHours = {
    id?: number;
    startTime: string;
    endTime: string;
    weekday: string;
};

export type ExceptionWorkingHours = {
    id: number;
    ownerRoom?: string;
    startDate: string;
    startDateTimezoneOffset: number;
    endDate: string;
    endDateTimezoneOffset: number;
    outOfService: boolean;
};

export type Accessibility = {
    id: number;
    name: string;
};

export interface ExamRoom {
    id: number;
    _id?: number;
    name: string;
    examMachines: ExamMachine[];
    localTimezone: string;
    roomInstruction: string;
    roomInstructionEN: string;
    roomInstructionSV: string;
    roomCode: string;
    defaultWorkingHours: DefaultWorkingHours[];
    calendarExceptionEvents: ExceptionWorkingHours[];
    examStartingHours: WorkingHour[];
    accessibilities: Accessibility[];
    outOfService: boolean;
    statusComment: string;
    buildingName: string;
    mailAddress: Address;
    state: 'ACTIVE' | 'INACTIVE';
    campus: string;
    contactPerson: string;
    videoRecordingsURL: string;
    availableForExternals: boolean;
    externalRef: string | null;
}

export interface ExamMachine {
    id: number;
    name: string;
    room: ExamRoom;
    outOfService: boolean;
    statusComment?: string;
    archived: boolean;
    softwareInfo: {
        id: number;
        status: string;
        name: string;
    }[];
    otherIdentifier: string;
    accessibilityInfo: string;
    accessible: boolean;
    surveillanceCamera: string;
    videoRecordings: string;
    ipAddress: string;
}

export interface ExternalReservation {
    roomTz: string;
    orgName: string;
    orgCode: string;
    buildingName: string;
    campus: string;
    roomCode: string;
    mailAddress: { street: string; zip: string; city: string };
    machineName: string;
    roomName: string;
    roomInstructionEN: string;
    roomInstruction: string;
    roomInstructionSV: string;
}

export interface Reservation {
    id: number;
    enrolment: ExamEnrolment;
    externalRef?: string;
    externalReservation?: ExternalReservation;
    externalUserRef?: string;
    externalOrgRef?: string;
    externalOrgName?: string;
    machine: ExamMachine;
    startAt: string;
    endAt: string;
    user: User;
}
