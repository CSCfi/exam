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
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type { ReviewedExam } from '../../enrolment/enrolment.model';
import { SessionService } from '../../session/session.service';
import type { CollaborativeExam, Exam, ExamParticipation } from '../exam.model';
import { CollaborativeExamState } from '../exam.model';

export type CollaborativeParticipation = Omit<ExamParticipation, 'exam'> & { exam: ReviewedExam } & {
    examId: string;
    noShow: false;
    _id: string;
    _rev: string;
};

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
        const paramStr = '?filter=' + (searchTerm && searchTerm.length > 0 ? encodeURIComponent(searchTerm) : '');
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
