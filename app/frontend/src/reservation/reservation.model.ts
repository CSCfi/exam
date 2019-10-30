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
import moment = require('moment');

import { ExamEnrolment } from '../enrolment/enrolment.model';
import { User } from '../session/session.service';

export type DefaultWorkingHours = {
    startTime: Date;
    endTime: Date;
    weekday: string;
};

export type ExceptionWorkingHours = {
    startDate: Date;
    endDate: Date;
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
    defaultWorkingHours: DefaultWorkingHours[];
    calendarExceptionEvents: ExceptionWorkingHours[];
    accessibilities: Accessibility[];
    outOfService: boolean;
    statusComment: string;
}

export interface ExamMachine {
    id: number;
    name: string;
    room: ExamRoom;
}

export interface ExternalReservation {
    roomTz: string;
    orgName: string;
    orgCode: string;
    machineName: string;
    roomName: string;
    roomInstructionEN: string;
    roomInstruction: string;
    roomInstructionSV: string;
}

export interface Reservation {
    id: number;
    noShow: boolean;
    enrolment: ExamEnrolment;
    externalRef?: string;
    externalReservation?: ExternalReservation;
    externalUserRef?: string;
    machine: ExamMachine;
    startAt: moment.MomentInput;
    endAt: moment.MomentInput;
    user: User;
    retrialPermitted: boolean;
}
