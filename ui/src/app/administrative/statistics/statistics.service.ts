// SPDX-FileCopyrightText: 2024 The members of the EXAM Consortium
//
// SPDX-License-Identifier: EUPL-1.2

import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { catchError } from 'rxjs/operators';
import { ExamInfo, Participations, QueryParams } from 'src/app/administrative/administrative.model';
import { Reservation } from 'src/app/reservation/reservation.model';
import { ErrorHandlingService } from 'src/app/shared/error/error-handler-service';

@Injectable({ providedIn: 'root' })
export class StatisticsService {
    constructor(
        private http: HttpClient,
        private errorHandler: ErrorHandlingService,
    ) {}

    listDepartments$ = () =>
        this.http
            .get<{ departments: string[] }>('/app/reports/departments')
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listDepartments')));

    listExams$ = (params: QueryParams) =>
        this.http
            .get<ExamInfo[]>('/app/reports/exams', { params: params })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listExams')));

    listReservations$ = (params: QueryParams) =>
        this.http
            .get<{ noShows: number; appearances: number }>('/app/reports/reservations', { params: params })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listReservations')));

    listResponses$ = (params: QueryParams) =>
        this.http
            .get<{ assessed: number; unAssessed: number; aborted: number }>('/app/reports/responses', {
                params: params,
            })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listResponses')));

    listParticipations$ = (params: QueryParams) =>
        this.http
            .get<Participations>('/app/reports/participations', { params: params })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listParticipations')));

    listIopReservations$ = (params: QueryParams) =>
        this.http
            .get<Reservation[]>('/app/reports/reservations/iop', { params: params })
            .pipe(catchError((err) => this.errorHandler.handle(err, 'StatisticsService.listIopReservations')));
}
