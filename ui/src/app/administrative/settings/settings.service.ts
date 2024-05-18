// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

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

@Injectable({ providedIn: 'root' })
export class SettingsService {
    constructor(private http: HttpClient) {}

    updateAgreement$ = (config: AppConfig) => this.http.put('/app/settings/agreement', { value: config.eula });

    updateDeadline$ = (config: AppConfig) => this.http.put('/app/settings/deadline', { value: config.reviewDeadline });

    updateReservationWindow$ = (config: AppConfig) =>
        this.http.put('/app/settings/reservationWindow', { value: config.reservationWindowSize });

    listAttributes$ = () => this.http.get<string[]>('/attributes');

    getConfig$ = () => this.http.get<AppConfig>('/app/config');
}
