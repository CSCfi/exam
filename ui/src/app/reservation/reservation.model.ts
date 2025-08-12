// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import type { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { CollaborativeExam, Implementation } from 'src/app/exam/exam.model';
import { Address, WorkingHour } from 'src/app/facility/facility.model';
import type { User } from 'src/app/session/session.model';
import { isObject } from 'src/app/shared/miscellaneous/helpers';

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
    internalPassword?: string;
    externalPassword?: string;
    internalPasswordRequired: boolean;
    externalPasswordRequired: boolean;
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

// All of this is needed to put all our reservations in one basket :D
type ExamEnrolmentDisplay = ExamEnrolment & { teacherAggregate: string };
type MachineDisplay = Omit<ExamMachine, 'room'> & { room: Partial<ExamRoom> };
type ReservationDisplay = Omit<Reservation, 'machine' | 'enrolment'> & {
    machine: Partial<MachineDisplay>;
    userAggregate: string;
    stateOrd: number;
    enrolment: ExamEnrolmentDisplay;
};
export type LocalTransferExamEnrolment = Omit<ExamEnrolmentDisplay, 'exam'> & {
    exam: { id: number; external: true; examOwners: User[]; state: string; parent: null };
};
type CollaborativeExamEnrolment = Omit<ExamEnrolmentDisplay, 'exam'> & {
    exam: CollaborativeExam & { examOwners: User[]; parent: null; implementation: Implementation };
};
export type LocalTransferExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: LocalTransferExamEnrolment;
};
export type RemoteTransferExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: ExamEnrolmentDisplay;
    org: { name: string; code: string };
};
type CollaborativeExamReservation = Omit<ReservationDisplay, 'enrolment'> & {
    enrolment: CollaborativeExamEnrolment;
};

export type AnyReservation =
    | ReservationDisplay
    | LocalTransferExamReservation
    | RemoteTransferExamReservation
    | CollaborativeExamReservation;

// Transfer examination taking place here
export function isLocalTransfer(reservation: AnyReservation): reservation is LocalTransferExamReservation {
    return !reservation.enrolment || isObject(reservation.enrolment.externalExam);
}
// Transfer examination taking place elsewhere
export function isRemoteTransfer(reservation: AnyReservation): reservation is RemoteTransferExamReservation {
    return isObject(reservation.externalReservation);
}
export function isCollaborative(reservation: AnyReservation): reservation is CollaborativeExamReservation {
    return isObject(reservation.enrolment?.collaborativeExam);
}
