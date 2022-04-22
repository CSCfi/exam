import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import type { EnrolmentInfo, ExamEnrolment } from '../enrolment.model';

@Injectable({ providedIn: 'root' })
export class ExamSearchService {
    constructor(private http: HttpClient) {}

    getEnrolmentPermissionCheckStatus$ = () =>
        this.http.get<{ active: boolean }>('/app/settings/enrolmentPermissionCheck');

    listExams$ = (filter: string) =>
        this.http.get<EnrolmentInfo[]>('/app/student/exams', { params: { filter: filter } });

    checkEnrolmentStatus$ = (id: number) => this.http.get<ExamEnrolment[]>(`/app/enrolments/exam/${id}`);
}
