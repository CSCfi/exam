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

/** Effective student data retention policy. Periods are ISO 8601 durations, as in the configuration. */
export interface RetentionConfig {
    dryRun: boolean;
    batchSize: number;
    studentInactivity: string;
    booking: string;
    assessedAttempt: string;
    maturityAttempt: string;
    abortedAttempt: string;
    autoLock: string;
    record: string;
    hostCopy: string;
}

export interface AppConfig {
    eula: string;
    examMaxDate: string;
    examDurations: number[];
    examMaxDuration: number;
    examMinDuration: number;
    retention: RetentionConfig;
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
