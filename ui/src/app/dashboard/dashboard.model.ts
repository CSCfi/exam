// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { Exam, ExamExecutionType } from 'src/app/exam/exam.model';

export interface Occasion {
    startAt: string;
    endAt: string;
    tz: string;
}

export interface DashboardExam extends Exam {
    ownerAggregate: string;
    unassessedCount: number;
    unfinishedCount: number;
    reservationCount: number;
    assessedCount: number;
}

export interface DashboardEnrolment extends ExamEnrolment {
    occasion?: Occasion;
    startAtAggregate: string;
}

export class Dashboard {
    executionTypes: ExamExecutionType[] = [];
    draftExams: DashboardExam[] = [];
    activeExams: DashboardExam[] = [];
    finishedExams: DashboardExam[] = [];
    archivedExams: DashboardExam[] = [];
}

export interface ExtraData {
    text: string;
    property: keyof DashboardExam;
    link: string[];
    checkOwnership: boolean;
    sliced?: boolean;
}
