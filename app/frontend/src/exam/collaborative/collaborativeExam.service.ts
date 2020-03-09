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

import { SessionService } from '../../session/session.service';
import { CollaborativeExam, Participation, CollaborativeExamState } from '../exam.model';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class CollaborativeExamService {
    exams: CollaborativeExam[];

    constructor(private http: HttpClient, private Session: SessionService) {}

    listStudentParticipations = (): Observable<Participation[]> =>
        this.http.get<Participation[]>('/integration/iop/student/finishedExams');

    listExams = (): Observable<CollaborativeExam[]> => {
        const path = this.Session.getUser().isStudent ? '/integration/iop/enrolments' : '/integration/iop/exams';
        return this.http.get<CollaborativeExam[]>(path);
    };

    createExam = (): Observable<CollaborativeExam> => this.http.post<CollaborativeExam>('/integration/iop/exams', {});

    searchExams = (searchTerm: string): Observable<CollaborativeExam[]> => {
        const paramStr = '?filter=' + (searchTerm && searchTerm.length > 0 ? encodeURIComponent(searchTerm) : '');
        // This path is used to search from student view only
        const path = this.Session.getUser().isStudent
            ? `/integration/iop/enrolment/search${paramStr}`
            : `/integration/iop/exams/search${paramStr}`;
        return this.http.get<CollaborativeExam[]>(path);
    };

    getExamStateTranslation = (exam: CollaborativeExam): string | null => {
        switch (exam.state) {
            case CollaborativeExamState.DRAFT:
                return 'sitnet_draft';
            case CollaborativeExamState.PRE_PUBLISHED:
                return 'sitnet_pre_published';
            case CollaborativeExamState.PUBLISHED:
                return 'sitnet_published';
            default:
                return null;
        }
    };
}
