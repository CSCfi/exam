// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { Course, Exam, ExamSection } from 'src/app/exam/exam.model';
import { Accessibility, ExamRoom } from 'src/app/reservation/reservation.model';

export interface Slot {
    start: string;
    end: string;
    conflictingExam?: boolean;
    roomId: number | string;
    examId: number;
    orgId: string | null;
    aids?: number[];
    sectionIds: number[];
}

export interface OpeningHours {
    name: string;
    ref: string;
    ord: number;
    periods: string[];
    periodText?: string;
}

export type SelectableSection = ExamSection & { selected: boolean };
export type ExamInfo = Omit<Partial<Exam>, 'course' | 'examSections'> & { course: Course } & {
    duration: number;
    examSections: (ExamSection & { selected: boolean })[];
};
export type Organisation = {
    _id: string;
    name: string;
    code: string;
    filtered: boolean;
    homeOrg: string;
    facilities: ExamRoom[];
};
export type AvailableSlot = Slot & { availableMachines: number };

export type FilterableAccessibility = Accessibility & { filtered: boolean };
