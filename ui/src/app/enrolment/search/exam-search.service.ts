// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import type { EnrolmentInfo, ExamEnrolment } from 'src/app/enrolment/enrolment.model';

@Injectable({ providedIn: 'root' })
export class ExamSearchService {
    private http = inject(HttpClient);

    getEnrolmentPermissionCheckStatus$ = () =>
        this.http.get<{ active: boolean }>('/app/settings/enrolmentPermissionCheck');

    listExams$ = (filter: string) =>
        this.http.get<EnrolmentInfo[]>('/app/student/exams', { params: { filter: filter } });

    checkEnrolmentStatus$ = (id: number) => this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${id}`);
}
