// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

export type QueryParams = { start?: string; end?: string; dept?: string };

export type ExamInfo = {
    name: string;
    participations: number;
    state: string;
    rank: number;
};

export type Participations = {
    [room: string]: { date: string }[];
};

export interface AppConfig {
    eula: string;
    examMaxDate: string;
    examDurations: number[];
    examMaxDuration: number;
    examMinDuration: number;
    expirationPeriod: string;
    anonymousReviewEnabled: boolean;
    hasCourseSearchIntegration: boolean;
    hasEnrolmentCheckIntegration: boolean;
    isGradeScaleOverridable: boolean;
    isInteroperable: boolean;
    defaultTimeZone: string;
    maxFileSize: number;
    reservationWindowSize: number;
    reviewDeadline: number;
    roles: { ADMIN: string[]; TEACHER: string[]; STUDENT: string[] };
    supportsMaturity: boolean;
    supportsPrintouts: boolean;
    isExamVisitSupported: boolean;
    isExamCollaborationSupported: boolean;
    courseSearchIntegrationUrls: { [key: string]: string };
}
