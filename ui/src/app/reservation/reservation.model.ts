// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { Address, WorkingHour } from 'src/app/facility/facility.model';
import type { User } from 'src/app/session/session.model';

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
    machine: ExamMachine;
    startAt: string;
    endAt: string;
    user: User;
}
