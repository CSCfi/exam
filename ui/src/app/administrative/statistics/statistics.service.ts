import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Exam, ExamParticipation } from 'src/app/exam/exam.model';

export type QueryParams = { start?: string; end?: string; dept?: string };
export type ExamInfo = {
    name: string;
    participations: number;
    state: string;
    rank: number;
};
export type Participations = {
    [room: string]: ExamParticipation[];
};

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    constructor(private http: HttpClient) {}

    listDepartments$ = () => this.http.get<{ departments: string[] }>('/app/reports/departments');
    listExams$ = (params: QueryParams) => this.http.get<ExamInfo[]>('/app/reports/exams', { params: params });
    listReservations$ = (params: QueryParams) =>
        this.http.get<{ noShow: boolean }[]>('/app/reports/reservations', { params: params });
    listResponses$ = (params: QueryParams) => this.http.get<Exam[]>('/app/reports/responses', { params: params });
    listParticipations$ = (params: QueryParams) =>
        this.http.get<Participations>('/app/reports/participations', { params: params });
}
