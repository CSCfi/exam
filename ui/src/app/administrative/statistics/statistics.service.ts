// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { ExamInfo, Participations, QueryParams } from 'src/app/administrative/administrative.model';
import { Reservation } from 'src/app/reservation/reservation.model';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    constructor(private http: HttpClient) {}

    listDepartments$ = () => this.http.get<{ departments: string[] }>('/app/reports/departments');
    listExams$ = (params: QueryParams) => this.http.get<ExamInfo[]>('/app/reports/exams', { params: params });
    listReservations$ = (params: QueryParams) =>
        this.http.get<{ noShows: number; appearances: number }>('/app/reports/reservations', { params: params });
    listResponses$ = (params: QueryParams) =>
        this.http.get<{ assessed: number; unAssessed: number; aborted: number }>('/app/reports/responses', {
            params: params,
        });
    listParticipations$ = (params: QueryParams) =>
        this.http.get<Participations>('/app/reports/participations', { params: params });
    listIopReservations$ = (params: QueryParams) =>
        this.http.get<Reservation[]>('/app/reports/reservations/iop', { params: params });
}
