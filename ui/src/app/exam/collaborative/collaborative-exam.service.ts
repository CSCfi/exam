// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { CollaborativeExam, Exam } from 'src/app/exam/exam.model';
import { CollaborativeExamState } from 'src/app/exam/exam.model';
import { SessionService } from 'src/app/session/session.service';

@Injectable({ providedIn: 'root' })
export class CollaborativeExamService {
    exams: CollaborativeExam[] = [];

    constructor(
        private http: HttpClient,
        private Session: SessionService,
    ) {}

    listExams$ = (): Observable<CollaborativeExam[]> => {
        const path = this.Session.getUser().isStudent ? '/app/iop/enrolments' : '/app/iop/exams';
        return this.http.get<CollaborativeExam[]>(path);
    };

    createExam$ = (): Observable<CollaborativeExam> => this.http.post<CollaborativeExam>('/app/iop/exams', {});

    searchExams$ = (searchTerm: string): Observable<CollaborativeExam[]> => {
        const paramStr = searchTerm ? `?filter=${encodeURIComponent(searchTerm)}` : '';
        const path = `/app/iop/exams${paramStr}`;
        return this.http.get<CollaborativeExam[]>(path);
    };

    getExamStateTranslation = (exam: CollaborativeExam): string | null => {
        switch (exam.state) {
            case CollaborativeExamState.DRAFT:
                return 'i18n_draft';
            case CollaborativeExamState.PRE_PUBLISHED:
                return 'i18n_pre_published';
            case CollaborativeExamState.PUBLISHED:
                return 'i18n_published';
            default:
                return null;
        }
    };

    download$ = (id: number) => this.http.get<Exam>(`/app/iop/exams/${id}`);
}
