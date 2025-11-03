// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { EnrolmentInfo, ExamEnrolment } from 'src/app/enrolment/enrolment.model';
import { StorageService } from 'src/app/shared/storage/storage.service';

@Injectable({ providedIn: 'root' })
export class ExamSearchService {
    private http = inject(HttpClient);
    private webStorageService = inject(StorageService);

    getEnrolmentPermissionCheckStatus$ = () =>
        this.http.get<{ active: boolean }>('/app/settings/enrolmentPermissionCheck');

    listExams$ = (filter: string) =>
        this.http.get<EnrolmentInfo[]>('/app/student/exams', { params: { filter: filter } });

    checkEnrolmentStatus$ = (id: number) => this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${id}`);

    loadFilters = (category: string) => {
        const entry = this.webStorageService.get<Record<string, string>>('examFilters');
        return entry && entry[category] ? JSON.parse(entry[category]) : {};
    };

    storeFilters = (filters: unknown, category: string) => {
        const data = { filters: filters };
        const filter = this.webStorageService.get<Record<string, string>>('examFilters') || {};
        filter[category] = JSON.stringify(data);
        this.webStorageService.set('examFilters', filter);
    };
}
