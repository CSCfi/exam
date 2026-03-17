// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { ExamInfo, Participations, QueryParams } from 'src/app/administrative/administrative.model';
import { Reservation } from 'src/app/reservation/reservation.model';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    private readonly http = inject(HttpClient);

    listDepartments$ = () => this.http.get<{ departments: string[] }>('/app/statistics/departments');
    listExams$ = (params: QueryParams) => this.http.get<ExamInfo[]>('/app/statistics/exams', { params: params });
    listReservations$ = (params: QueryParams) =>
        this.http.get<{ noShows: number; appearances: number }>('/app/statistics/reservations', { params: params });
    listResponses$ = (params: QueryParams) =>
        this.http.get<{ assessed: number; unAssessed: number; aborted: number }>('/app/statistics/responses', {
            params: params,
        });
    listParticipations$ = (params: QueryParams) =>
        this.http.get<Participations>('/app/statistics/participations', { params: params });
    listIopReservations$ = (params: QueryParams) =>
        this.http.get<Reservation[]>('/app/statistics/reservations/iop', { params: params });
}
